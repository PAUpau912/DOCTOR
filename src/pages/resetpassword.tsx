import React, { useState } from "react";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs"; // ✅ import bcryptjs

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      // ✅ Hash password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const userId = localStorage.getItem("reset_user_id"); // assuming may naka-save na user id
      if (!userId) {
        alert("Error: user not found.");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({ password: hashedPassword })
        .eq("id", userId);

      if (error) {
        console.error("Error updating password:", error);
        alert("❌ Failed to reset password.");
        return;
      }

      localStorage.removeItem("reset_user_id");
      alert("✅ Password has been reset successfully!");
      navigate("/");
    } catch (err) {
      console.error("Error hashing password:", err);
      alert("❌ Failed to reset password.");
    }
  };

  return (
    <div className="StartPage">
      <div className="Right">
        <div className="LoginContainer w-100" style={{ maxWidth: 400 }}>
          <h3 className="text-center">Reset Your Password</h3>
          <form onSubmit={handleReset}>
            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-lock IconOutside"></i>
              <input
                type="password"
                placeholder="Enter new password"
                className="InputField form-control ps-5"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="InputRow mb-3 position-relative">
              <i className="fas fa-lock IconOutside"></i>
              <input
                type="password"
                placeholder="Confirm password"
                className="InputField form-control ps-5"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="LoginButton btn w-100">
              Reset Password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
