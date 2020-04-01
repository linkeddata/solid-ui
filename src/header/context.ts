import {DataBrowserContext, PaneRegistry} from "pane-registry";
import {IndexedFormula} from "rdflib";
import {getOutliner} from "./outliner";

export function createContext (
    dom: HTMLDocument,
    paneRegistry: PaneRegistry,
    store: IndexedFormula
): DataBrowserContext {
    return {
        dom,
        getOutliner,
        session: {
            paneRegistry,
            store
        }
    }
}