import { Link, useLocation } from "react-router";
import { battlePrepPath } from "../lib/lastGame";

export default function NavTabs() {
    const location = useLocation();

    // Computed fresh on every render (not memoized) so it picks up the latest
    // "last visited game" as soon as it changes, e.g. right after switching
    // games on the Encounters page.
    const tabs = [
        { path: battlePrepPath(), label: "Battle Prep", isActive: (pathname: string) => pathname !== "/encounters" },
        { path: "/encounters", label: "Encounters", isActive: (pathname: string) => pathname === "/encounters" },
    ];

    return (
        <div className="nav-tabs">
            {tabs.map((tab) => (
                <Link
                    to={tab.path}
                    className={`nav-tab${tab.isActive(location.pathname) ? " active" : ""}`}
                    key={tab.label}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}
