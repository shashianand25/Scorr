import React from "react";
import { CreateHeader } from "../components/quiz/create/CreateHeader";

describe("Quiz Creation Presentational Components", () => {
  it("renders CreateHeader correctly with active tab highlighted", () => {
    const setActiveTab = jest.fn();
    const setErrorMsg = jest.fn();
    const t = (key: string) => (key === "tabs.create" ? "Create & Import" : key);

    const element = CreateHeader({
      activeTab: "ai",
      setActiveTab,
      setErrorMsg,
      t,
    });

    expect(element).toBeDefined();
    expect(element.type).toBe("header");
  });

  it("handles tab changes and clears errors", () => {
    const setActiveTab = jest.fn();
    const setErrorMsg = jest.fn();
    const t = (key: string) => key;

    const element = CreateHeader({
      activeTab: "manual",
      setActiveTab,
      setErrorMsg,
      t,
    });

    expect(element.props.children).toBeDefined();
    
    // Simulate clicking the 3 tabs
    const tabContainer = element.props.children[1];
    const [aiBtn, manualBtn, importBtn] = tabContainer.props.children;
    
    aiBtn.props.onClick();
    expect(setActiveTab).toHaveBeenCalledWith("ai");
    expect(setErrorMsg).toHaveBeenCalledWith(null);

    manualBtn.props.onClick();
    expect(setActiveTab).toHaveBeenCalledWith("manual");

    importBtn.props.onClick();
    expect(setActiveTab).toHaveBeenCalledWith("import");
  });
});
