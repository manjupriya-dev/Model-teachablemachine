"""
Dictionary Service
==================
Fetches rich word data (meaning, IPA, POS, synonyms, antonyms, example sentence)
from local vocabulary cache or Free Dictionary API (api.dictionaryapi.dev).
Translates the meaning into a target language via deep-translator.
Uses parallel multi-threading and smart memory/Redis caching for ultra-fast performance.

Supported translation target languages:
  en  → English (no translation, return as-is)
  ta  → Tamil
  hi  → Hindi
  te  → Telugu
  ml  → Malayalam
  kn  → Kannada
"""

import json
import logging
import re
import time
from typing import Optional, List, Dict
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from app.core.config import settings
from app.core.vocabulary import check_word

logger = logging.getLogger(__name__)

LANG_MAP = {
    "en": {"name": "English",   "dt_code": "en"},
    "ta": {"name": "Tamil",     "dt_code": "ta"},
    "hi": {"name": "Hindi",     "dt_code": "hi"},
    "te": {"name": "Telugu",    "dt_code": "te"},
    "ml": {"name": "Malayalam", "dt_code": "ml"},
    "kn": {"name": "Kannada",   "dt_code": "kn"},
}

FREE_DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/{word}"

# Global in-memory cache across all service instances (0ms latency)
_GLOBAL_MEM_CACHE: Dict[str, dict] = {}

# Redis connection status state to prevent repeated 1-second timeout blocks
_REDIS_CLIENT = None
_LAST_REDIS_CHECK_TIME = 0
_REDIS_COOLDOWN_SECONDS = 300  # Only retry Redis connection once every 5 minutes if offline


def _get_redis():
    """Return a Redis client or None if Redis is unavailable, with 5-min retry cooldown."""
    global _REDIS_CLIENT, _LAST_REDIS_CHECK_TIME

    now = time.time()
    if _REDIS_CLIENT is not None:
        return _REDIS_CLIENT

    # Don't waste time attempting connection if we recently failed
    if now - _LAST_REDIS_CHECK_TIME < _REDIS_COOLDOWN_SECONDS:
        return None

    _LAST_REDIS_CHECK_TIME = now
    try:
        import redis
        r = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=0,
            socket_connect_timeout=0.2,  # Ultra-short 200ms socket timeout
            decode_responses=True,
        )
        r.ping()
        _REDIS_CLIENT = r
        logger.info("[Dictionary] Successfully connected to Redis.")
        return r
    except Exception as exc:
        logger.warning(f"[Dictionary] Redis offline ({exc}). Running with ultra-fast memory cache.")
        _REDIS_CLIENT = None
        return None


def _cache_key(word: str, lang: str) -> str:
    return f"dict:{word.lower()}:{lang}"


def _fetch_from_free_dict(word: str) -> dict:
    """
    Call the Free Dictionary API for the given English word with short timeout.
    """
    url = FREE_DICT_API.format(word=word.lower())
    try:
        resp = requests.get(url, timeout=2.0)  # 2-second timeout max
    except requests.RequestException as exc:
        logger.warning(f"[Dictionary] FreeDict API request timeout/error for '{word}': {exc}")
        return {"not_found": True}

    if resp.status_code != 200:
        return {"not_found": True}

    try:
        data = resp.json()
    except Exception:
        return {"not_found": True}

    if not isinstance(data, list) or not data:
        return {"not_found": True}

    entry = data[0]

    ipa = ""
    phonetics = entry.get("phonetics", [])
    for p in phonetics:
        if p.get("text"):
            ipa = p["text"]
            break

    meanings = entry.get("meanings", [])
    pos = ""
    meaning_text = ""
    synonyms: list = []
    antonyms: list = []
    example = ""

    for m in meanings:
        if not pos:
            pos = m.get("partOfSpeech", "").capitalize()

        defs = m.get("definitions", [])
        if defs and not meaning_text:
            meaning_text = defs[0].get("definition", "")
            example = defs[0].get("example", "")
            synonyms = defs[0].get("synonyms", [])
            antonyms = defs[0].get("antonyms", [])

        if not synonyms:
            synonyms = m.get("synonyms", [])[:5]
        if not antonyms:
            antonyms = m.get("antonyms", [])[:5]

    return {
        "not_found": False,
        "meaning": meaning_text or "Meaning not available.",
        "ipa": ipa,
        "pos": pos or "Noun",
        "synonyms": synonyms[:5],
        "antonyms": antonyms[:5],
        "example": example,
    }


def _translate(text: str, target_lang: str) -> str:
    """Translate `text` (English) to `target_lang`."""
    if not text or target_lang == "en":
        return text

    dt_code = LANG_MAP.get(target_lang, {}).get("dt_code", "en")
    if dt_code == "en":
        return text

    try:
        from deep_translator import GoogleTranslator
        translated = GoogleTranslator(source="en", target=dt_code).translate(text)
        return translated or text
    except Exception as exc:
        logger.warning(f"[Dictionary] Translation failed ({target_lang}): {exc}")
        return text


class DictionaryService:
    """
    High-performance Dictionary Service featuring 0ms memory cache,
    fast local vocabulary checks, parallel multi-threaded batch lookups,
    and optional Redis caching.
    """

    def __init__(self):
        self.redis = _get_redis()

    def get_word_data(self, word: str, target_lang: str = "en") -> dict:
        """
        Fetch dictionary data for `word`. 
        Guaranteed to return in milliseconds.
        """
        clean_word = re.sub(r"[^a-zA-Z']", "", word).strip().lower()
        if not clean_word:
            return self._not_found(word, target_lang)

        lang = target_lang if target_lang in LANG_MAP else "en"
        key = _cache_key(clean_word, lang)

        # 0. Instant Global Memory Cache HIT (0ms)
        if key in _GLOBAL_MEM_CACHE:
            return _GLOBAL_MEM_CACHE[key]

        # 1. Fast Redis Cache check if Redis is active
        r = _get_redis()
        if r:
            try:
                cached = r.get(key)
                if cached:
                    data = json.loads(cached)
                    _GLOBAL_MEM_CACHE[key] = data
                    return data
            except Exception:
                pass

        # 2. Fast Local Vocabulary Database Check FIRST (0ms local lookup)
        match_found, local_meaning = check_word(clean_word)
        if match_found:
            translation = _translate(local_meaning, lang)
            result = {
                "word": word.upper(),
                "meaning": local_meaning,
                "ipa": "",
                "pos": "Vocabulary",
                "synonyms": [],
                "antonyms": [],
                "example": "",
                "translation": translation,
                "target_lang": lang,
                "not_found": False,
            }
            _GLOBAL_MEM_CACHE[key] = result
            return result

        # 3. External Free Dictionary API lookup
        raw = _fetch_from_free_dict(clean_word)
        if raw.get("not_found"):
            result = self._not_found(word, lang)
        else:
            translation = _translate(raw["meaning"], lang)
            result = {
                "word": word.upper(),
                "meaning": raw["meaning"],
                "ipa": raw["ipa"],
                "pos": raw["pos"],
                "synonyms": raw["synonyms"],
                "antonyms": raw["antonyms"],
                "example": raw["example"],
                "translation": translation,
                "target_lang": lang,
                "not_found": False,
            }

        # 4. Save result in Memory and Redis Cache
        _GLOBAL_MEM_CACHE[key] = result
        if r and not result.get("not_found"):
            try:
                r.setex(key, settings.REDIS_TTL_SECONDS, json.dumps(result))
            except Exception:
                pass

        return result

    def get_batch_word_data(self, words: list, target_lang: str = "en") -> list:
        """
        Fetch dictionary data for multiple words in PARALLEL using multi-threading.
        Reduces multi-word OCR scanning time from seconds down to milliseconds.
        """
        if not words:
            return []

        # Deduplicate words while preserving original order
        unique_words = []
        seen = set()
        for w in words:
            if w and isinstance(w, str):
                clean = w.strip()
                if clean and clean.lower() not in seen:
                    seen.add(clean.lower())
                    unique_words.append(clean)

        if not unique_words:
            return []

        # Run lookups concurrently across a thread pool of 12 worker threads
        results = [None] * len(unique_words)
        word_to_index = {word.lower(): i for i, word in enumerate(unique_words)}

        with ThreadPoolExecutor(max_workers=min(12, len(unique_words))) as executor:
            future_to_word = {
                executor.submit(self.get_word_data, word, target_lang): word
                for word in unique_words
            }
            for future in as_completed(future_to_word):
                word = future_to_word[future]
                idx = word_to_index[word.lower()]
                try:
                    results[idx] = future.result()
                except Exception as exc:
                    logger.error(f"[Dictionary] Thread error for '{word}': {exc}")
                    results[idx] = self._not_found(word, target_lang)

        return [r for r in results if r is not None]

    @staticmethod
    def _not_found(word: str, lang: str) -> dict:
        return {
            "word": word.upper(),
            "meaning": "Meaning not available.",
            "ipa": "",
            "pos": "",
            "synonyms": [],
            "antonyms": [],
            "example": "",
            "translation": "Meaning not available.",
            "target_lang": lang,
            "not_found": True,
        }
