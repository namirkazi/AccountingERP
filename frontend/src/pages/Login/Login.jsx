import { useState } from "react";
import { useNavigate } from "react-router-dom";

import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";

import { useAuth } from "../../context/AuthContext";

import styles from "./Login.module.css";

export default function Login() {

    const navigate = useNavigate();

    const { login } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {

        event.preventDefault();

        setError("");
        setLoading(true);

        try {

            await login(username, password);

            navigate("/dashboard", {
                replace: true
            });

        } catch (error) {

            setError(
                error.message ||
                "Invalid username or password."
            );

        } finally {

            setLoading(false);

        }
    }

    return (

        <div className={styles.container}>

            <Card>

                <div className={styles.logoArea}>

                    <div className={styles.logoCircle}>
                        ERP
                    </div>

                    <h1>
                        Accounting ERP
                    </h1>

                    <p>
                        Sign in to continue
                    </p>

                </div>

                <form
                    onSubmit={handleSubmit}
                    className={styles.form}
                >

                    <Input
                        label="Username"
                        placeholder="Enter username"
                        value={username}
                        onChange={(event) =>
                            setUsername(event.target.value)
                        }
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(event) =>
                            setPassword(event.target.value)
                        }
                        required
                    />

                    {error && (

                        <div className={styles.error}>
                            {error}
                        </div>

                    )}

                    <label className={styles.checkbox}>

                        <input
                            type="checkbox"
                        />

                        Remember Me

                    </label>

                    <Button
                        type="submit"
                        fullWidth
                        disabled={loading}
                    >
                        {loading
                            ? "Signing in..."
                            : "Login"
                        }
                    </Button>

                </form>

                <div className={styles.footer}>

                    Version 1.0

                </div>

            </Card>

        </div>

    );
}