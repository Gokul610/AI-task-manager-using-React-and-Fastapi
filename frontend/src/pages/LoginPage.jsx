// frontend/src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email, password);
      navigate('/dashboard');
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Login failed. Please try again.';
      setError(errorDetail);
    } finally { // Use finally to ensure loading is set to false
        setLoading(false);
    }
  };

  return (
    // Use page background color
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      {/* Login form container uses card styles */}
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-xl shadow-card border border-border">
        <h2 className="text-3xl font-bold text-center">
          Log In
        </h2>
        {error && (
          // Use destructive colors for error
          <p className="px-4 py-3 text-sm font-medium text-center text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
            {error}
          </p>
        )}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Input component is themed */}
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {/* Button component is themed */}
          <Button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </Button>
        </form>
        {/* Link uses muted text, primary on hover */}
        <p className="text-sm text-center text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/signup" className="font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
