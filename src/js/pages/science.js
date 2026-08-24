import { initShared } from '../main.js'
import { initOrganExplorer } from '../three/organ-explorer.js'

/* The Science page uses the shared organ explorer (also mounted on
 * the homepage). Hash-aware so /science.html#condition-ulcer works. */
initShared()
initOrganExplorer(document.body, { hashAware: true })
