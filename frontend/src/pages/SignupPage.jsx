// frontend/src/pages/SignupPage.jsx

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    try {
      await authService.signup(email, password, fullName);
      // Log in immediately after signup
      await authService.login(email, password);
      navigate('/dashboard'); // Redirect to dashboard after successful signup and login
    } catch (err) {
      const errorDetail = err.response?.data?.detail || 'Signup failed. Please try again.';
      setError(errorDetail);
    } finally { // Use finally to ensure loading is set to false
        setLoading(false);
    }
  };

  return (
     // Use page background color
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
       {/* Signup form container uses card styles */}
      <div className="w-full max-w-md p-8 space-y-6 bg-card text-card-foreground rounded-xl shadow-card border border-border">
        <h2 className="text-3xl font-bold text-center">
          Create Account
        </h2>
        {error && (
           // Use destructive colors for error
          <p className="px-4 py-3 text-sm font-medium text-center text-destructive-foreground bg-destructive/20 border border-destructive/30 rounded-lg">
            {error}
          </p>
        )}
        <form onSubmit={handleSignup} className="space-y-6">
           {/* Input components are themed */}
          <Input
            label="Full Name"
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
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
            label="Password (min. 8 characters)"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {/* Button component is themed */}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Sign Up'}
          </Button>
        </form>
         {/* Link uses muted text, primary on hover */}
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default SignupPage;
