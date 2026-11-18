// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import MobileQuickBar from "./MobileQuickBar";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe("MobileQuickBar", () => {
    let container;
    let root;

    beforeEach(() => {
        mockNavigate.mockClear();
        container = document.createElement("div");
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(() => {
        act(() => {
            root.unmount();
        });
        container.remove();
    });

    const renderBar = (initialPath = "/") => {
        act(() => {
            root.render(
                <MemoryRouter initialEntries={[initialPath]}>
                    <MobileQuickBar />
                </MemoryRouter>
            );
        });
    };

    it("renders all 4 navigation buttons with ARIA labels", () => {
        renderBar();
        const nav = container.querySelector('nav[aria-label="Mobile quick navigation"]');
        expect(nav).not.toBeNull();
        expect(container.querySelectorAll("button")).toHaveLength(4);
    });

    it("navigates to the right route on click", () => {
        renderBar();
        const getBtn = (label) => container.querySelector(`button[aria-label="${label}"]`);

        act(() => getBtn("Home").click());
        expect(mockNavigate).toHaveBeenCalledWith("/");

        act(() => getBtn("Track").click());
        expect(mockNavigate).toHaveBeenCalledWith("/my-reports");

        act(() => getBtn("Report").click());
        expect(mockNavigate).toHaveBeenCalledWith("/report");

        act(() => getBtn("Profile").click());
        expect(mockNavigate).toHaveBeenCalledWith("/profile");
    });

    it("highlights active route and nested sub-routes", () => {
        renderBar("/my-reports/CMP-2026-001");
        const trackBtn = container.querySelector('button[aria-label="Track"]');
        const homeBtn = container.querySelector('button[aria-label="Home"]');

        expect(trackBtn.getAttribute("aria-current")).toBe("page");
        expect(homeBtn.getAttribute("aria-current")).toBeNull();
    });

    it("hides at the bottom of a scrollable page and reappears when scrolling up", () => {
        renderBar("/report");
        const nav = container.querySelector("nav");
        expect(nav.className).toContain("opacity-100");

        const scrollBox = document.createElement("div");
        Object.defineProperties(scrollBox, {
            scrollHeight: { value: 1000, configurable: true },
            clientHeight: { value: 500, configurable: true },
            scrollTop: { value: 460, configurable: true },
        });
        document.body.appendChild(scrollBox);

        act(() => {
            scrollBox.dispatchEvent(new Event("scroll", { bubbles: false }));
        });
        expect(nav.className).toContain("opacity-0");

        Object.defineProperty(scrollBox, "scrollTop", { value: 100, configurable: true });
        act(() => {
            scrollBox.dispatchEvent(new Event("scroll", { bubbles: false }));
        });
        expect(nav.className).toContain("opacity-100");

        scrollBox.remove();
    });
});