import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function PrivateRoute({ children }) {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    // Check if user has a profile (company setup)
    // We allow access to /onboarding even if no profile, obviously
    const isOnboarding = window.location.pathname === "/onboarding";

    if (!currentUser.profile?.companyProfile && !isOnboarding) {
        return <Navigate to="/onboarding" />;
    }

    if (currentUser.profile?.companyProfile && isOnboarding) {
        return <Navigate to="/" />;
    }

    return children;
}
