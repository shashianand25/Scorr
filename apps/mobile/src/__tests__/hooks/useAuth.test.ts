describe('Auth Lifecycle State Transitions', () => {
  interface AuthState {
    user: any | null;
    isLoading: boolean;
    error: string | null;
  }

  function authReducer(state: AuthState, action: { type: string; payload?: any }): AuthState {
    switch (action.type) {
      case 'AUTH_START':
        return { ...state, isLoading: true, error: null };
      case 'AUTH_SUCCESS':
        return { ...state, isLoading: false, user: action.payload, error: null };
      case 'AUTH_FAILURE':
        return { ...state, isLoading: false, user: null, error: action.payload };
      case 'SIGN_OUT':
        return { ...state, user: null, isLoading: false, error: null };
      default:
        return state;
    }
  }

  it('handles sign-in flow properly', () => {
    let state: AuthState = { user: null, isLoading: false, error: null };

    state = authReducer(state, { type: 'AUTH_START' });
    expect(state.isLoading).toBe(true);

    const mockUser = { uid: 'u100', email: 'test@scorr.app' };
    state = authReducer(state, { type: 'AUTH_SUCCESS', payload: mockUser });
    expect(state.isLoading).toBe(false);
    expect(state.user).toEqual(mockUser);
  });

  it('handles sign-in error and clears user', () => {
    let state: AuthState = { user: { uid: 'u1' }, isLoading: false, error: null };
    state = authReducer(state, { type: 'AUTH_FAILURE', payload: 'Invalid password' });
    expect(state.user).toBeNull();
    expect(state.error).toBe('Invalid password');
  });
});
