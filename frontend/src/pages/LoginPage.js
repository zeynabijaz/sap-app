import React, { useState } from "react";
import { loginUser } from "../api";
import { servers } from "../config/servers";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [environment, setEnvironment] = useState("dev");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Set client number based on environment
      const client = environment === 'dev' ? '110' : '300';
      const result = await loginUser(username, password, environment);
      onLogin({
        ...result,
        client,
        server: environment.toUpperCase()
      });
    } catch (err) {
      console.error("Login page error:", err);
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="login-page">
    <div className="login-container">
      <h2>SAP Login</h2>

      <form onSubmit={handleSubmit}>
        {/* Environment */}
        <div className="form-group">
          <label>Server</label>
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            required
          >
            {servers.map((server) => (
              <option key={server.value} value={server.value}>
                {server.label}
              </option>
            ))}
          </select>
        </div>

        {/* Username */}
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={username}
            placeholder="Enter username"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        {/* Password */}
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            placeholder="Enter password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Login Button */}
        <button type="submit" className="btn">
          Login
        </button>

        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
    </div>

  );
}
