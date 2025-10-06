<script>
  import { supabase } from './supabase.js';

  let { onSuccess, onSkip } = $props();

  let mode = $state('login');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let playerName = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleLogin() {
    if (!email || !password) {
      error = 'Please enter both email and password';
      return;
    }

    loading = true;
    error = '';

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (signInError) throw signInError;

      if (data.user) {
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (playerError) {
          console.error('Error fetching player:', playerError);
        }

        onSuccess(data.user, playerData);
      }
    } catch (err) {
      console.error('Login error:', err);
      error = err.message || 'Failed to sign in';
    } finally {
      loading = false;
    }
  }

  async function handleSignup() {
    if (!email || !password || !playerName) {
      error = 'Please fill in all fields';
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match';
      return;
    }

    loading = true;
    error = '';

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            display_name: playerName.trim()
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        const { data: existingPlayer } = await supabase
          .from('players')
          .select('id')
          .eq('name', playerName.trim())
          .eq('is_guest', true)
          .is('user_id', null)
          .maybeSingle();

        let playerRecord;

        if (existingPlayer) {
          const { data: claimedPlayer, error: updateError } = await supabase
            .from('players')
            .update({
              user_id: data.user.id,
              is_guest: false,
              email: email.trim(),
              display_name: playerName.trim(),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingPlayer.id)
            .select()
            .single();

          if (updateError) throw updateError;
          playerRecord = claimedPlayer;
        } else {
          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert({
              name: playerName.trim(),
              user_id: data.user.id,
              is_guest: false,
              email: email.trim(),
              display_name: playerName.trim(),
              email_consent: true,
              total_games: 0,
              total_wins: 0
            })
            .select()
            .single();

          if (createError) throw createError;
          playerRecord = newPlayer;
        }

        onSuccess(data.user, playerRecord);
      }
    } catch (err) {
      console.error('Signup error:', err);
      error = err.message || 'Failed to create account';
    } finally {
      loading = false;
    }
  }

  async function handleGoogleSignIn() {
    loading = true;
    error = '';

    try {
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (signInError) throw signInError;
    } catch (err) {
      console.error('Google sign-in error:', err);
      error = err.message || 'Failed to sign in with Google';
      loading = false;
    }
  }

  function switchMode() {
    mode = mode === 'login' ? 'signup' : 'login';
    error = '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleSignup();
    }
  }
</script>

<div class="auth-form-container">
  <div class="auth-tabs">
    <button
      class="auth-tab"
      class:active={mode === 'login'}
      onclick={() => { mode = 'login'; error = ''; }}
    >
      Login
    </button>
    <button
      class="auth-tab"
      class:active={mode === 'signup'}
      onclick={() => { mode = 'signup'; error = ''; }}
    >
      Sign Up
    </button>
  </div>

  <form onsubmit={handleSubmit}>
    {#if mode === 'signup'}
      <div class="form-group">
        <label for="playerName">Player Name</label>
        <input
          type="text"
          id="playerName"
          bind:value={playerName}
          placeholder="Enter your name"
          disabled={loading}
          required
        />
      </div>
    {/if}

    <div class="form-group">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        placeholder="your@email.com"
        disabled={loading}
        required
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        placeholder="••••••••"
        disabled={loading}
        required
      />
    </div>

    {#if mode === 'signup'}
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          bind:value={confirmPassword}
          placeholder="••••••••"
          disabled={loading}
          required
        />
      </div>
    {/if}

    {#if error}
      <div class="error-message">{error}</div>
    {/if}

    <button type="submit" class="submit-btn" disabled={loading}>
      {#if loading}
        <span class="spinner"></span>
      {:else}
        {mode === 'login' ? 'Sign In' : 'Create Account'}
      {/if}
    </button>
  </form>

  <div class="divider">
    <span>or</span>
  </div>

  <button class="google-btn" onclick={handleGoogleSignIn} disabled={loading}>
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    Continue with Google
  </button>

  <button class="guest-btn" onclick={onSkip} disabled={loading}>
    Continue as Guest
  </button>

  {#if mode === 'login'}
    <div class="footer-text">
      Don't have an account?
      <button class="link-btn" onclick={switchMode}>Sign up</button>
    </div>
  {:else}
    <div class="footer-text">
      Already have an account?
      <button class="link-btn" onclick={switchMode}>Sign in</button>
    </div>
  {/if}
</div>

<style>
  .auth-form-container {
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    padding: 0 1rem;
    box-sizing: border-box;
  }

  .auth-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }

  .auth-tab {
    flex: 1;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
  }

  .auth-tab:hover {
    color: white;
  }

  .auth-tab.active {
    color: white;
    border-bottom-color: white;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: white;
    font-size: 0.9rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem;
    border-radius: 8px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    background-color: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1rem;
    box-sizing: border-box;
    transition: all 0.2s ease;
  }

  .form-group input::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }

  .form-group input:focus {
    outline: none;
    border-color: white;
    background-color: rgba(255, 255, 255, 0.15);
  }

  .form-group input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error-message {
    padding: 0.75rem;
    background-color: rgba(239, 68, 68, 0.2);
    border: 1px solid rgba(239, 68, 68, 0.5);
    border-radius: 6px;
    color: #fca5a5;
    font-size: 0.9rem;
    margin-bottom: 1rem;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .submit-btn {
    width: 100%;
    padding: 0.875rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    box-sizing: border-box;
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.875rem;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
  }

  .divider span {
    padding: 0 1rem;
  }

  .google-btn {
    width: 100%;
    padding: 0.875rem;
    background: white;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: #333;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    box-sizing: border-box;
  }

  .google-btn:hover:not(:disabled) {
    background: #f8f9fa;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .google-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .guest-btn {
    width: 100%;
    padding: 0.875rem;
    background: rgba(255, 255, 255, 0.1);
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .guest-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.15);
    border-color: rgba(255, 255, 255, 0.4);
    transform: translateY(-2px);
  }

  .guest-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .footer-text {
    text-align: center;
    margin-top: 1.5rem;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.9rem;
  }

  .link-btn {
    background: none;
    border: none;
    color: white;
    font-weight: 600;
    text-decoration: underline;
    cursor: pointer;
    padding: 0;
    margin-left: 0.25rem;
    font-size: 0.9rem;
  }

  .link-btn:hover {
    color: #667eea;
  }

  @media (max-width: 600px) {
    .auth-form-container {
      max-width: calc(100vw - 2rem);
      padding: 0 1rem;
    }

    .form-group input {
      font-size: 16px;
    }
  }

  @media (max-width: 400px) {
    .auth-form-container {
      max-width: 100%;
      padding: 0 0.75rem;
    }

    .auth-tabs {
      gap: 0.25rem;
    }

    .auth-tab {
      padding: 0.625rem 0.5rem;
      font-size: 0.9rem;
    }

    .form-group input,
    .submit-btn,
    .google-btn,
    .guest-btn {
      font-size: 15px;
    }

    .divider span {
      padding: 0 0.5rem;
    }
  }
</style>
