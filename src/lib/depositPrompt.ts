// Ask the app to show the "not enough balance" prompt with a direct way to add money.
// Works from anywhere (hooks, dialogs, pages) without needing router or React context:
// <GlobalDepositPrompt /> (mounted once in App) listens for this event.
export const DEPOSIT_PROMPT_EVENT = 'njl:request-deposit'

export interface DepositPromptDetail {
  needed?: number      // NC required for the action
  available?: number   // NC the user has
  message?: string     // optional custom explanation
}

export const requestDeposit = (detail: DepositPromptDetail = {}) => {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<DepositPromptDetail>(DEPOSIT_PROMPT_EVENT, { detail }))
}
