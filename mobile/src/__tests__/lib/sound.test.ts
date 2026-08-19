describe('Audio & Sound Player Safety Handlers', () => {
  class MockAudioPlayer {
    isPlaying = false;
    position = 0;
    play() { this.isPlaying = true; }
    pause() { this.isPlaying = false; }
    seekTo(pos: number) { this.position = pos; }
  }

  function safeStopSound(player: any) {
    try {
      if (player && typeof player.pause === 'function') {
        player.pause();
        player.seekTo(0);
      }
    } catch {}
  }

  it('safely pauses and resets active sound players', () => {
    const player = new MockAudioPlayer();
    player.play();
    player.seekTo(5000);
    expect(player.isPlaying).toBe(true);

    safeStopSound(player);
    expect(player.isPlaying).toBe(false);
    expect(player.position).toBe(0);
  });

  it('handles null or invalid player references without throwing', () => {
    expect(() => safeStopSound(null)).not.toThrow();
    expect(() => safeStopSound(undefined)).not.toThrow();
    expect(() => safeStopSound({ invalid: true })).not.toThrow();
  });
});
