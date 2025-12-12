import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: JSX.Element;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  const userRole = localStorage.getItem("user_role");

  // ✅ Check if user is logged in AND is doctor
  if (isAuthenticated !== "true" || userRole !== "doctor") {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PrivateRoute;
