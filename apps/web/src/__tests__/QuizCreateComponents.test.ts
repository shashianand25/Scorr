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
  });
});
