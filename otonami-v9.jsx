import { useState, useEffect, useRef } from "react";

// OTONAMI v9 SaaS VERSION
// Credits + Stripe Checkout Integration
// 1 Pitch = 1 Credit

const PRICING = [
  { credits: 5, price: 500, label: "Starter" },
  { credits: 25, price: 2000, label: "Popular" },
  { credits: 70, price: 5000, label: "Recommended" },
  { credits: 200, price: 9800, label: "Pro" }
];

const API_BASE = "http://localhost:3001";

export default function OtonamiApp() {

  const [credits, setCredits] = useState(5);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const purchaseCredits = async (plan) => {

    try {

      setLoading(true);

      const res = await fetch(`${API_BASE}/create-checkout-session`, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(plan)

      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      }

    } catch (err) {

      alert("Payment error");

    } finally {

      setLoading(false);

    }

  };

  const sendPitch = () => {

    if (credits <= 0) {

      alert("Not enough credits");

      return;

    }

    setCredits(prev => prev - 1);

    setMessage("Pitch sent successfully");

  };

  return (

    <div style={{ padding: 30, fontFamily: "sans-serif" }}>

      <h1>OTONAMI</h1>

      <div style={{background:"#111",color:"#fff",padding:20,borderRadius:12,marginBottom:20}}>
        Credits: {credits}
      </div>

      <button
        onClick={sendPitch}
        style={{padding:20,fontSize:18,background:"black",color:"white",borderRadius:10,marginBottom:30}}
      >
        Send Pitch (1 Credit)
      </button>

      <h2>Buy Credits</h2>

      {PRICING.map(plan => (

        <button

          key={plan.price}

          disabled={loading}

          onClick={() => purchaseCredits(plan)}

          style={{
            display: "block",
            padding: 20,
            marginBottom: 10,
            fontSize: 16,
            borderRadius: 10
          }}

        >

          +{plan.credits} credits — ¥{plan.price}

        </button>

      ))}

      {message && <div style={{marginTop:20}}>{message}</div>}

    </div>

  );

}

export function PurchaseSuccess() {

  return (

    <div style={{ padding: 40 }}>

      <h2>Payment Successful</h2>

      <p>Credits added</p>

    </div>

  );

}
