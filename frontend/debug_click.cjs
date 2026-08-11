const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log(`PAGE ERROR: ${error.message}`));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000); // Wait for load
  
  console.log("Setting up file chooser...");
  page.on('filechooser', async (fileChooser) => {
    console.log("File chooser opened!");
    fs.writeFileSync('dummy2.png', 'fake image data');
    await fileChooser.setFiles('dummy2.png');
    console.log("File selected in file chooser.");
  });

  // Find the big Upload button in Class 2
  // We can evaluate in the page to find it
  const clicked = await page.evaluate(() => {
    const panels = document.querySelectorAll('div > span');
    let class2Panel = null;
    for (let p of panels) {
      if (p.textContent === 'Class 2') {
        class2Panel = p.parentElement.parentElement;
        break;
      }
    }
    
    if (class2Panel) {
      const buttons = class2Panel.querySelectorAll('button');
      for (let b of buttons) {
        if (b.textContent.includes('Upload')) {
          b.click();
          return true;
        }
      }
    }
    return false;
  });
  
  console.log("Did we click Class 2 Upload button?", clicked);
  
  await page.waitForTimeout(2000); // wait for state to update
  
  // check if it succeeded
  const html = await page.evaluate(() => document.body.innerHTML);
  if (html.includes('1 image sample')) {
    console.log("SUCCESS");
  } else {
    console.log("FAILURE");
  }
  
  await browser.close();
})();
