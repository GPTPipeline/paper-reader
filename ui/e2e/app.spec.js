import { expect, test } from '@playwright/test'

const papers = [
  {
    id: '1',
    title: 'RecursiveMAS',
    authors: JSON.stringify(['Author 1']),
    published: '2026-05-10',
    downloaded_at: '2026-05-14',
    category: 'MAS',
    source: 'arxiv',
    summary: 'A recursive multi-agent systems paper.',
    status: 'UNREAD',
    notebook_status: 'NOT_ADDED',
    local_path: '../papers/recursive.pdf',
  },
  {
    id: '2',
    title: 'AutoGUI-v2',
    authors: JSON.stringify(['Author 2']),
    published: '2026-05-08',
    downloaded_at: '2026-05-13',
    category: 'GUI Agents',
    source: 'hf_trending',
    summary: 'A GUI agents benchmark.',
    status: 'READING',
    notebook_status: 'NOT_ADDED',
    local_path: '',
  },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript((mockPapers) => {
    window.__paperBotCalls = {
      getPapers: 0,
      updatePaperStatus: [],
      updateNotebookStatus: [],
      openNotebook: [],
      startDrag: [],
      getPdfPreview: [],
      updateLastOpened: [],
    }

    window.electronAPI = {
      getPapers: async () => {
        window.__paperBotCalls.getPapers += 1
        return mockPapers
      },
      updatePaperStatus: async (id, status) => {
        window.__paperBotCalls.updatePaperStatus.push({ id, status })
        return true
      },
      updateNotebookStatus: async (id, status) => {
        window.__paperBotCalls.updateNotebookStatus.push({ id, status })
        return true
      },
      openNotebook: async (pdfPath) => {
        window.__paperBotCalls.openNotebook.push(pdfPath)
        return true
      },
      startDrag: (pdfPath, title) => {
        window.__paperBotCalls.startDrag.push({ pdfPath, title })
      },
      getPdfPreview: async (pdfPath) => {
        window.__paperBotCalls.getPdfPreview.push(pdfPath)
        return { ok: true, url: 'about:blank' }
      },
      updateLastOpened: async (id) => {
        window.__paperBotCalls.updateLastOpened.push(id)
        return true
      },
    }
  }, papers)
})

test('explores papers with filters and detail preview', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-app-mode', 'explore')
  await expect(page.getByText('RecursiveMAS')).toBeVisible()
  await expect(page.getByText('AutoGUI-v2')).toBeVisible()

  await page.getByLabel('Category').selectOption('GUI Agents')
  await expect(page.getByText('RecursiveMAS')).toBeHidden()
  await expect(page.getByText('AutoGUI-v2')).toBeVisible()

  await page.getByLabel('Category').selectOption('all')
  await page.getByText('RecursiveMAS').first().click()
  await expect(page.getByText('A recursive multi-agent systems paper.')).toBeVisible()

  await page.getByRole('button', { name: 'Preview PDF' }).click()
  await expect(page.locator('iframe[title="PDF preview"]')).toBeVisible()

  const calls = await page.evaluate(() => window.__paperBotCalls)
  expect(calls.updateLastOpened).toContain('1')
  expect(calls.getPdfPreview).toEqual(['../papers/recursive.pdf'])
})

test('queues a single row and opens the queue view', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '+ Queue' }).first().click()

  await expect(page.getByText('1 queued', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Explore queue summary')).toContainText('RecursiveMAS')
  await expect(page.getByRole('button', { name: 'Queued' })).toBeVisible()

  await page.getByRole('button', { name: 'View Queue' }).click()
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-app-mode', 'build-notebook')
  await expect(page.getByRole('heading', { name: 'Notebook Queue' })).toBeVisible()
  await expect(page.getByText('RecursiveMAS')).toHaveCount(2)
})

test('adds selected papers to queue and marks a paper as added', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Add Selected to Queue' })).toBeDisabled()
  await page.getByLabel('Select RecursiveMAS').check()
  await expect(page.getByText(/1 selected/)).toBeVisible()
  await page.getByRole('button', { name: 'Add Selected to Queue' }).click()

  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-app-mode', 'build-notebook')
  await expect(page.getByRole('heading', { name: 'Notebook Queue' })).toBeVisible()

  await page.getByRole('button', { name: 'Mark Added' }).click()

  const calls = await page.evaluate(() => window.__paperBotCalls.updateNotebookStatus)
  expect(calls).toEqual([{ id: '1', status: 'ADDED' }])
})

test('supports mode keyboard shortcuts and search focus', async ({ page }) => {
  await page.goto('/')

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', ctrlKey: true, bubbles: true })))
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-app-mode', 'build-notebook')

  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', ctrlKey: true, bubbles: true })))
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-app-mode', 'notebook')

  await page.keyboard.press('/')
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-app-mode', 'explore')
  await expect(page.getByLabel('Search papers')).toBeFocused()
})
