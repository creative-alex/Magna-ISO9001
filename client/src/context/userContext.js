import { createContext, useState } from "react";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [username, setUsername] = useState(null);
  const [userEmail, setUserEmail] = useState(""); 

  return (
    <UserContext.Provider value={{ username, setUsername, userEmail, setUserEmail }}>
      {children}
    </UserContext.Provider>
  );
};
