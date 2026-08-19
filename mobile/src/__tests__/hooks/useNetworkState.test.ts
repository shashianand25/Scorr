describe('Network State & Connectivity Handling', () => {
  function computeNetworkReachable(isConnected: boolean | null, isInternetReachable: boolean | null): boolean {
    return isConnected === true && isInternetReachable !== false;
  }

  it('treats active connection with reachable internet as online', () => {
    expect(computeNetworkReachable(true, true)).toBe(true);
  });

  it('detects captive portal / WiFi without internet reachability as offline', () => {
    expect(computeNetworkReachable(true, false)).toBe(false);
  });

  it('treats disconnected state as offline', () => {
    expect(computeNetworkReachable(false, null)).toBe(false);
  });
});
