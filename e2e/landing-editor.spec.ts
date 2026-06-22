import { test, expect } from '@playwright/test';

test.describe('Admin Landing Editor - Inline Mode', () => {
  
  test.beforeEach(async ({ page }) => {
    // Note: Assuming a valid admin session or cookie is set for these tests
    // In a real environment, you'd use a setup step to bypass login
  });

  test('should load the inline editor and allow clicking elements', async ({ page }) => {
    await page.goto('/admin/landing-editor');
    
    // Verify the editor mode toolbar is visible
    await expect(page.locator('text="Editor Mode"')).toBeVisible();

    // Click on the hero tagline to open the edit modal
    // The wrapper has group and cursor-pointer. We can target the h1
    await page.locator('h1').click();
    
    // Verify modal opens
    await expect(page.locator('h3:has-text("Chỉnh sửa nội dung")')).toBeVisible();
    
    // Change the tagline in the textarea
    await page.fill('textarea', 'TESTING INLINE TAGLINE');
    await page.click('button:has-text("Xong")');
    
    // Verify it updates on the screen
    await expect(page.locator('h1', { hasText: 'TESTING INLINE TAGLINE' })).toBeVisible();
  });

  test('should publish changes and reflect on live site', async ({ page }) => {
    await page.goto('/admin/landing-editor');
    
    // Edit tagline
    await page.locator('h1').click();
    await page.fill('textarea', 'E2E TEST PUBLISHED INLINE TAGLINE');
    await page.click('button:has-text("Xong")');
    
    // Publish
    page.on('dialog', dialog => dialog.accept());
    await page.click('button:has-text("Publish")');
    
    // Go to public page
    await page.goto('/');
    
    // Verify changes are live
    await expect(page.locator('h1', { hasText: 'E2E TEST PUBLISHED INLINE TAGLINE' })).toBeVisible();
  });

});
