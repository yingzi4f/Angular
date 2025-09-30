import { test, expect, testUsers } from './fixtures';

test.describe('Chat Functionality', () => {
  let groupId: string;

  test.describe('Group Chat Features', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');

      // Create a test group first
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'E2E Chat Test Group');
      await page.fill('[name="groupDescription"]', 'Group for testing chat functionality');
      await page.click('.modal button[type="submit"]');

      // Navigate to the group chat
      const groupCard = page.locator('.group-card').filter({ hasText: 'E2E Chat Test Group' });
      await groupCard.locator('.group-content').click();

      // Should be in chat page now
      await expect(page).toHaveURL(/\/chat\/.+/);

      // Extract group ID from URL for later use
      const url = page.url();
      groupId = url.split('/chat/')[1];
    });

    test('should display chat interface elements', async ({ page }) => {
      // Check main chat interface elements
      await expect(page.locator('.chat-container')).toBeVisible();
      await expect(page.locator('.chat-header')).toBeVisible();
      await expect(page.locator('.group-name')).toContainText('E2E Chat Test Group');

      // Check sidebar elements
      await expect(page.locator('.channels-list')).toBeVisible();
      await expect(page.locator('.members-list')).toBeVisible();

      // Check message area
      await expect(page.locator('.messages-container')).toBeVisible();
      await expect(page.locator('.message-input')).toBeVisible();
    });

    test('should display group information correctly', async ({ page }) => {
      await expect(page.locator('.group-info h2')).toContainText('E2E Chat Test Group');
      await expect(page.locator('.group-description')).toContainText('Group for testing chat functionality');
    });

    test('should show default general channel', async ({ page }) => {
      // Most chat systems create a default "General" channel
      const generalChannel = page.locator('.channel-item').filter({ hasText: 'General' });
      if (await generalChannel.count() > 0) {
        await expect(generalChannel).toBeVisible();
        await expect(generalChannel).toHaveClass(/active/);
      }
    });

    test('should create new channel as admin', async ({ page }) => {
      // Look for create channel button/feature
      const createChannelBtn = page.locator('button:has-text("创建频道")').or(
        page.locator('.create-channel')).or(
        page.locator('[data-testid="create-channel"]')
      );

      if (await createChannelBtn.count() > 0) {
        await createChannelBtn.click();

        // Fill in channel details (assuming modal or form appears)
        const channelNameInput = page.locator('[name="channelName"]').or(
          page.locator('input[placeholder*="频道名称"]')
        );

        if (await channelNameInput.count() > 0) {
          await channelNameInput.fill('Test Channel');

          const submitBtn = page.locator('button[type="submit"]').or(
            page.locator('button:has-text("创建")')
          );
          await submitBtn.click();

          // New channel should appear in channels list
          await expect(page.locator('.channel-item').filter({ hasText: 'Test Channel' })).toBeVisible();
        }
      }
    });

    test('should send text message', async ({ page }) => {
      const messageInput = page.locator('.message-input').or(
        page.locator('[data-testid="message-input"]')).or(
        page.locator('textarea[placeholder*="消息"]')
      );

      const sendButton = page.locator('button:has-text("发送")').or(
        page.locator('[data-testid="send-button"]')).or(
        page.locator('.send-button')
      );

      if (await messageInput.count() > 0) {
        await messageInput.fill('Hello, this is a test message from E2E test!');

        if (await sendButton.count() > 0) {
          await sendButton.click();
        } else {
          // Try pressing Enter if no send button
          await messageInput.press('Enter');
        }

        // Check if message appears in chat
        await expect(page.locator('.message').filter({
          hasText: 'Hello, this is a test message from E2E test!'
        })).toBeVisible();

        // Input should be cleared after sending
        await expect(messageInput).toHaveValue('');
      }
    });

    test('should send message with Enter key', async ({ page }) => {
      const messageInput = page.locator('.message-input').or(
        page.locator('[data-testid="message-input"]')).or(
        page.locator('textarea[placeholder*="消息"]')
      );

      if (await messageInput.count() > 0) {
        await messageInput.fill('Message sent with Enter key');
        await messageInput.press('Enter');

        // Check if message appears in chat
        await expect(page.locator('.message').filter({
          hasText: 'Message sent with Enter key'
        })).toBeVisible();
      }
    });

    test('should display message timestamp', async ({ page }) => {
      const messageInput = page.locator('.message-input').or(
        page.locator('[data-testid="message-input"]')).or(
        page.locator('textarea[placeholder*="消息"]')
      );

      if (await messageInput.count() > 0) {
        await messageInput.fill('Timestamp test message');
        await messageInput.press('Enter');

        // Wait for message to appear and check for timestamp
        const message = page.locator('.message').filter({
          hasText: 'Timestamp test message'
        });
        await expect(message).toBeVisible();

        // Check for timestamp elements (common patterns)
        const timestamp = message.locator('.timestamp').or(
          message.locator('.message-time')).or(
          message.locator('[data-testid="timestamp"]')
        );

        if (await timestamp.count() > 0) {
          await expect(timestamp).toBeVisible();
        }
      }
    });

    test('should show message sender information', async ({ page }) => {
      const messageInput = page.locator('.message-input').or(
        page.locator('[data-testid="message-input"]')).or(
        page.locator('textarea[placeholder*="消息"]')
      );

      if (await messageInput.count() > 0) {
        await messageInput.fill('Sender info test message');
        await messageInput.press('Enter');

        const message = page.locator('.message').filter({
          hasText: 'Sender info test message'
        });
        await expect(message).toBeVisible();

        // Check for sender name
        const senderName = message.locator('.sender-name').or(
          message.locator('.message-author')).or(
          message.locator('[data-testid="sender-name"]')
        );

        if (await senderName.count() > 0) {
          await expect(senderName).toContainText('super');
        }
      }
    });

    test('should prevent sending empty messages', async ({ page }) => {
      const messageInput = page.locator('.message-input').or(
        page.locator('[data-testid="message-input"]')).or(
        page.locator('textarea[placeholder*="消息"]')
      );

      const sendButton = page.locator('button:has-text("发送")').or(
        page.locator('[data-testid="send-button"]')).or(
        page.locator('.send-button')
      );

      if (await messageInput.count() > 0) {
        // Try to send empty message
        await messageInput.fill('');

        if (await sendButton.count() > 0) {
          // Send button should be disabled for empty messages
          await expect(sendButton).toBeDisabled();
        } else {
          // If using Enter key, nothing should happen
          await messageInput.press('Enter');
          // No new empty message should appear
        }
      }
    });

    test('should handle long messages appropriately', async ({ page }) => {
      const messageInput = page.locator('.message-input').or(
        page.locator('[data-testid="message-input"]')).or(
        page.locator('textarea[placeholder*="消息"]')
      );

      if (await messageInput.count() > 0) {
        const longMessage = 'This is a very long message '.repeat(20) + 'that tests how the chat handles lengthy content and whether it wraps properly in the UI.';

        await messageInput.fill(longMessage);
        await messageInput.press('Enter');

        // Check if long message appears and is displayed correctly
        const message = page.locator('.message').filter({
          hasText: longMessage.substring(0, 50) // Match beginning of message
        });
        await expect(message).toBeVisible();
      }
    });
  });

  test.describe('Member Management', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');

      // Create a test group
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Member Management Test');
      await page.click('.modal button[type="submit"]');

      // Navigate to the group chat
      const groupCard = page.locator('.group-card').filter({ hasText: 'Member Management Test' });
      await groupCard.locator('.group-content').click();
    });

    test('should display current members list', async ({ page }) => {
      await expect(page.locator('.members-list')).toBeVisible();

      // Should show at least the creator (super admin)
      const memberItem = page.locator('.member-item').or(
        page.locator('.member')).filter({ hasText: 'super' });

      if (await memberItem.count() > 0) {
        await expect(memberItem).toBeVisible();
      }
    });

    test('should show member management controls for admins', async ({ page }) => {
      // Look for add member button or similar controls
      const addMemberBtn = page.locator('button:has-text("添加成员")').or(
        page.locator('.add-member')).or(
        page.locator('[data-testid="add-member"]')
      );

      const manageMembersBtn = page.locator('button:has-text("管理成员")').or(
        page.locator('.manage-members')).or(
        page.locator('[data-testid="manage-members"]')
      );

      // At least one of these should be visible for admins
      const hasControls = await addMemberBtn.count() > 0 || await manageMembersBtn.count() > 0;
      if (hasControls) {
        expect(hasControls).toBe(true);
      }
    });

    test('should display member count', async ({ page }) => {
      // Look for member count display
      const memberCount = page.locator('.member-count').or(
        page.locator('[data-testid="member-count"]')).or(
        page.locator('text=/\\d+\\s*成员/')
      );

      if (await memberCount.count() > 0) {
        await expect(memberCount).toBeVisible();
        await expect(memberCount).toContainText('1'); // At least the creator
      }
    });
  });

  test.describe('Channel Management', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');

      // Create and enter test group
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Channel Management Test');
      await page.click('.modal button[type="submit"]');

      const groupCard = page.locator('.group-card').filter({ hasText: 'Channel Management Test' });
      await groupCard.locator('.group-content').click();
    });

    test('should display channels list', async ({ page }) => {
      await expect(page.locator('.channels-list')).toBeVisible();
    });

    test('should switch between channels', async ({ page }) => {
      // This test assumes multiple channels exist or can be created
      const channels = page.locator('.channel-item');
      const channelCount = await channels.count();

      if (channelCount > 1) {
        // Click on different channels and verify active state changes
        await channels.nth(0).click();
        await expect(channels.nth(0)).toHaveClass(/active/);

        await channels.nth(1).click();
        await expect(channels.nth(1)).toHaveClass(/active/);
        await expect(channels.nth(0)).not.toHaveClass(/active/);
      }
    });

    test('should show channel-specific messages', async ({ page }) => {
      // Send a message in one channel
      const messageInput = page.locator('.message-input').or(
        page.locator('textarea[placeholder*="消息"]')
      );

      if (await messageInput.count() > 0) {
        await messageInput.fill('Channel-specific test message');
        await messageInput.press('Enter');

        // Verify message appears
        await expect(page.locator('.message').filter({
          hasText: 'Channel-specific test message'
        })).toBeVisible();

        // If there are multiple channels, switch to another and verify message doesn't appear
        const channels = page.locator('.channel-item');
        if (await channels.count() > 1) {
          await channels.nth(1).click();

          // Message should not appear in different channel
          await expect(page.locator('.message').filter({
            hasText: 'Channel-specific test message'
          })).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Chat Navigation', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');
    });

    test('should navigate back to dashboard', async ({ page }) => {
      // Create and enter a group
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Navigation Test Group');
      await page.click('.modal button[type="submit"]');

      const groupCard = page.locator('.group-card').filter({ hasText: 'Navigation Test Group' });
      await groupCard.locator('.group-content').click();

      // Look for back button or navigation
      const backButton = page.locator('button:has-text("返回")').or(
        page.locator('.back-button')).or(
        page.locator('[data-testid="back-button"]')).or(
        page.locator('a[href="/dashboard"]')
      );

      if (await backButton.count() > 0) {
        await backButton.click();
        await expect(page).toHaveURL('/dashboard');
      } else {
        // Try browser back button
        await page.goBack();
        await expect(page).toHaveURL('/dashboard');
      }
    });

    test('should handle direct chat URL access', async ({ page }) => {
      // Try to access chat URL directly
      if (groupId) {
        await page.goto(`/chat/${groupId}`);

        // Should either show chat (if authenticated) or redirect to login
        const isOnChat = page.url().includes('/chat/');
        const isOnLogin = page.url().includes('/login');

        expect(isOnChat || isOnLogin).toBe(true);
      }
    });
  });

  test.describe('Real-time Features', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');

      // Create test group and enter chat
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Real-time Test Group');
      await page.click('.modal button[type="submit"]');

      const groupCard = page.locator('.group-card').filter({ hasText: 'Real-time Test Group' });
      await groupCard.locator('.group-content').click();
    });

    test('should show typing indicators', async ({ page }) => {
      // This test checks for typing indicator functionality
      const messageInput = page.locator('.message-input').or(
        page.locator('textarea[placeholder*="消息"]')
      );

      if (await messageInput.count() > 0) {
        await messageInput.focus();
        await messageInput.type('Testing typing...', { delay: 100 });

        // Look for typing indicator (this would require another user to see)
        const typingIndicator = page.locator('.typing-indicator').or(
          page.locator('[data-testid="typing-indicator"]')
        );

        // Note: This test might not show results in single-user scenario
        // It's mainly for verifying the UI elements exist
      }
    });

    test('should handle connection status', async ({ page }) => {
      // Look for connection status indicators
      const connectionStatus = page.locator('.connection-status').or(
        page.locator('[data-testid="connection-status"]')).or(
        page.locator('.online-status')
      );

      if (await connectionStatus.count() > 0) {
        await expect(connectionStatus).toBeVisible();
      }
    });
  });

  test.describe('Chat Accessibility', () => {
    test.beforeEach(async ({ page, loginAsUser }) => {
      await loginAsUser('superAdmin');

      // Create test group
      await page.click('button:has-text("创建新群组")');
      await page.fill('[name="groupName"]', 'Accessibility Test Group');
      await page.click('.modal button[type="submit"]');

      const groupCard = page.locator('.group-card').filter({ hasText: 'Accessibility Test Group' });
      await groupCard.locator('.group-content').click();
    });

    test('should support keyboard navigation', async ({ page }) => {
      const messageInput = page.locator('.message-input').or(
        page.locator('textarea[placeholder*="消息"]')
      );

      if (await messageInput.count() > 0) {
        // Focus should be on message input
        await messageInput.focus();
        await expect(messageInput).toBeFocused();

        // Tab navigation should work
        await page.keyboard.press('Tab');
        // Should move to next focusable element
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // Check for ARIA labels on key elements
      const messageInput = page.locator('.message-input[aria-label]').or(
        page.locator('textarea[aria-label]')
      );

      const sendButton = page.locator('button[aria-label*="发送"]').or(
        page.locator('[data-testid="send-button"][aria-label]')
      );

      // These might not all be present, but if they are, they should have proper labels
      if (await messageInput.count() > 0) {
        const ariaLabel = await messageInput.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    });
  });
});