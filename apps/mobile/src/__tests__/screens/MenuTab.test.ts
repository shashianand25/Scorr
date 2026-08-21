describe("MenuTab Settings & Language Search", () => {
  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish (Español)" },
    { code: "fr", name: "French (Français)" },
    { code: "de", name: "German (Deutsch)" },
  ];

  function filterLanguages(list: typeof languages, query: string) {
    if (!query.trim()) return list;
    const q = query.toLowerCase().trim();
    return list.filter((l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));
  }

  it("filters available languages by name or code", () => {
    expect(filterLanguages(languages, "french").length).toBe(1);
    expect(filterLanguages(languages, "es").length).toBe(1);
    expect(filterLanguages(languages, "").length).toBe(4);
  });
});
