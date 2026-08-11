const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173');

  // Wait for the UI to load
  await page.waitForSelector('text=Class 2');

  // Create a dummy image
  fs.writeFileSync('dummy.png', 'fake image data');

  console.log("Found page, finding second input...");
  
  // Set up a listener for file chooser
  page.on('filechooser', async (fileChooser) => {
    console.log("File chooser triggered!");
    await fileChooser.setFiles('dummy.png');
    console.log("File selected.");
  });

  // Click the 'Upload' button inside the second ClassPanel
  // We can find the button by looking for the second button with text "Upload"
  const buttons = await page.locator('button:has-text("Upload")');
  console.log(`Found ${await buttons.count()} upload buttons.`);
  
  if (await buttons.count() >= 2) {
    console.log("Clicking second upload button...");
    await buttons.nth(1).click();
  } else {
    console.log("Could not find second upload button.");
  }

  // Wait a bit to see if UI updates
  await page.waitForTimeout(2000);
  
  // check how many images are in Class 2
  const textContent = await page.locator('.class-panel-2-something').textContent().catch(()=>''); // actually just check text
  const bodyText = await page.evaluate(() => document.body.innerText);
  if (bodyText.includes("1 image sample")) {
      console.log("SUCCESS: Image uploaded to Class 2.");
  } else {
      console.log("FAILED: Image did not appear in Class 2.");
  }
  
  await browser.close();
})();
