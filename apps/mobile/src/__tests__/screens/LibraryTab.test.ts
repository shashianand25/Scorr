describe('LibraryTab Navigation & Filtering', () => {
  const libraryItems = [
    { id: 'c1', type: 'course', title: 'AP Biology 2026' },
    { id: 'c2', type: 'course', title: 'Organic Chemistry' },
    { id: 'u1', type: 'upload', title: 'Lecture Notes Chapter 4.pdf' },
  ];

  function filterLibrary(items: any[], activeTab: 'courses' | 'uploads', search = '') {
    return items.filter((item) => {
      const tabMatch = activeTab === 'courses' ? item.type === 'course' : item.type === 'upload';
      if (!tabMatch) return false;
      if (search.trim()) {
        return item.title.toLowerCase().includes(search.toLowerCase().trim());
      }
      return true;
    });
  }

  it('filters items according to selected library tab', () => {
    const courses = filterLibrary(libraryItems, 'courses');
    expect(courses.length).toBe(2);

    const uploads = filterLibrary(libraryItems, 'uploads');
    expect(uploads.length).toBe(1);
    expect(uploads[0].id).toBe('u1');
  });

  it('applies search filter on active tab items', () => {
    const searched = filterLibrary(libraryItems, 'courses', 'organic');
    expect(searched.length).toBe(1);
    expect(searched[0].title).toBe('Organic Chemistry');
  });
});
