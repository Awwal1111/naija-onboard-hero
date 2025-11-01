import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-text-primary">404</h1>
        <p className="text-xl text-text-secondary mb-4">Oops! Page not found</p>
        <Link to="/" className="text-primary hover:text-brand-green-hover underline font-medium">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
