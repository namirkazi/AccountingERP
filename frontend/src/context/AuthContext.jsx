import {
    createContext,
    useContext,
    useEffect,
    useState
} from "react";

import {
    login as loginRequest,
    logout as logoutRequest,
    getCurrentUser
} from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        checkAuthentication();

    }, []);

    async function checkAuthentication() {

        try {

            const response = await getCurrentUser();

            if (response.success) {
                setUser(response.data.user);
            }

        } catch {

            setUser(null);

        } finally {

            setLoading(false);

        }
    }

    async function login(username, password) {

        const response =
            await loginRequest(username, password);

        setUser(response.data.user);

        return response;
    }

    async function logout() {

        await logoutRequest();

        setUser(null);
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                logout,
                isAuthenticated: !!user
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {

    return useContext(AuthContext);

}