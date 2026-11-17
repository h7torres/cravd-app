import { createContext, useContext, useState } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState(() => {
    try {
      return localStorage.getItem("cravdUserId");
    } catch {
      return null;
    }
  });

  function login(id) {
    try {
      localStorage.setItem("cravdUserId", id);
    } catch {
      // ignore storage errors
    }
    setCurrentUserId(id);
  }

  function logout() {
    try {
      localStorage.removeItem("cravdUserId");
    } catch {
      // ignore storage errors
    }
    setCurrentUserId(null);
  }

  return (
    <UserContext.Provider value={{ currentUserId, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  return useContext(UserContext);
}