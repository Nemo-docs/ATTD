import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

export function useGetToken() {
  const { getToken } = useAuth();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateKey = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Request a token using the template name
      const longLivedToken = await getToken({
        template: process.env.NEXT_PUBLIC_JWT_TEMPLATE_API_KEY,
      });
      
      setApiKey(longLivedToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate API key");
      console.error("Error generating API key:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearApiKey = () => {
    setApiKey(null);
    setError(null);
  };

  return {
    apiKey,
    isLoading,
    error,
    generateKey,
    clearApiKey,
  };
}