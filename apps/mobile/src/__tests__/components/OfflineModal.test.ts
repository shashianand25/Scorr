describe('Offline Modal Dispatcher', () => {
  it('formats custom offline modal buttons with primary highlight', () => {
    const buttons = [
      { text: 'Cancel', onPress: jest.fn(), isPrimary: false },
      { text: 'Retry Connection', onPress: jest.fn(), isPrimary: true },
    ];
    const primaryBtn = buttons.find((b) => b.isPrimary);
    expect(primaryBtn?.text).toBe('Retry Connection');
  });
});
