import { useState, useEffect } from 'react';

interface AIInsights {
  marketCondition: string;
  confidence: number;
  predictions: {
    nextHour: {
      demandForecast: number;
      priceForecast: string;
      trend: string;
    };
    nextDay: {
      demandForecast: number;
      priceForecast: string;
      trend: string;
    };
  };
  recommendations: string[];
  riskIndicators: {
    volatility: string;
    marketStress: string;
    liquidity: string;
  };
}

export const useAIAdvisor = () => {
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAIInsights = async () => {
      try {
        // In a real implementation, this would call our Cloudflare Worker API
        // For demo purposes, we'll simulate the response
        setTimeout(() => {
          const mockInsights: AIInsights = {
            marketCondition: "Bullish",
            confidence: 0.87,
            predictions: {
              nextHour: {
                demandForecast: Math.floor(Math.random() * 5000) + 30000,
                priceForecast: (Math.random() * 200 + 50).toFixed(2),
                trend: Math.random() > 0.5 ? "up" : "down"
              },
              nextDay: {
                demandForecast: Math.floor(Math.random() * 10000) + 100000,
                priceForecast: (Math.random() * 250 + 40).toFixed(2),
                trend: Math.random() > 0.3 ? "up" : "down"
              }
            },
            recommendations: [
              "Market conditions favorable for solar investments. Consider increasing exposure by 15%",
              "Natural gas prices showing upward momentum. Evaluate hedging strategies",
              "Hydro generation expected to increase 12% next week due to seasonal patterns"
            ],
            riskIndicators: {
              volatility: "Medium",
              marketStress: "Low",
              liquidity: "High"
            }
          };
          
          setAiInsights(mockInsights);
          setIsLoading(false);
        }, 1500);
      } catch (err) {
        setError('Failed to load AI insights');
        setIsLoading(false);
      }
    };

    fetchAIInsights();
    
    // Refresh insights every 5 minutes
    const interval = setInterval(fetchAIInsights, 300000);
    
    return () => clearInterval(interval);
  }, []);

  return { aiInsights, isLoading, error };
};