import json
from pathlib import Path

VOCAB_FILE = Path(__file__).resolve().parent.parent.parent / "vocabulary.json"

DEFAULT_VOCABULARY = {
    "SATELLITE": "An artificial object placed in orbit around the Earth or another celestial body.",
    "MOUNTAIN": "A large natural elevation of the Earth's surface.",
    "COMPUTER": "An electronic device that processes and stores data.",
    "ROBOT": "A machine capable of carrying out a complex series of actions automatically.",
    "AI": "Artificial Intelligence - the simulation of human intelligence processes by machines.",
    "SHIP": "A large vessel watercraft that travels the world's oceans.",
    "MACHINE": "An apparatus using or applying mechanical power and having several parts, each with a definite function.",
    "NAVY": "The branch of a nation's armed forces that conducts military operations at sea.",
    "CARGO": "Goods carried on a ship, aircraft, or motor vehicle."
}

def load_vocabulary() -> dict:
    """Load vocabulary from the JSON file. Fallback to defaults if not found."""
    if not VOCAB_FILE.exists():
        save_vocabulary(DEFAULT_VOCABULARY)
        return DEFAULT_VOCABULARY
    try:
        with open(VOCAB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading vocabulary file: {e}")
        return DEFAULT_VOCABULARY

def save_vocabulary(vocab: dict) -> None:
    """Save vocabulary dictionary to JSON file."""
    try:
        with open(VOCAB_FILE, "w", encoding="utf-8") as f:
            json.dump(vocab, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving vocabulary file: {e}")

def check_word(word: str) -> tuple[bool, str]:
    """
    Check if word exists in vocabulary.
    Returns (match_found, meaning)
    """
    vocab = load_vocabulary()
    # Normalize word (strip whitespace and uppercase)
    clean_word = word.strip().upper()
    
    # If the detected word is empty, do not attempt to match
    if not clean_word:
        return False, ""
        
    # Direct match
    if clean_word in vocab:
        return True, vocab[clean_word]
        
    # Substring match (in case OCR picks up extra symbols or text)
    for k, v in vocab.items():
        if not k:
            continue
        if k in clean_word or clean_word in k:
            return True, v
            
    return False, ""

def add_word(word: str, meaning: str) -> bool:
    """Add a word and its meaning to the database."""
    vocab = load_vocabulary()
    clean_word = word.strip().upper()
    if not clean_word:
        return False
    vocab[clean_word] = meaning
    save_vocabulary(vocab)
    return True
