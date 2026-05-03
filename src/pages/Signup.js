import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
  validatePhoneNumber,
  validateRequired,
} from "../utils/validation";
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import {
  User,
  Calendar,
  MapPin,
  Home,
  Phone,
  Mail,
  Lock,
  ShieldCheck,
  Upload,
  AlertTriangle,
  Megaphone,
  ClipboardList,
  Bell,
  Info,
  X,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import "./Signup.css";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dypfxfpfz";
const CLOUDINARY_UPLOAD_PRESET = "barangay_proofs";

const Signup = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthday: "",
    permanentAddress: "",
    presentAddress: "",
    sameAsPermanent: false,
    purok: "",
    contactNumber: "",
    rememberMe: false,
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthday: "",
    permanentAddress: "",
    presentAddress: "",
    purok: "",
    contactNumber: "",
    proofFile: "",
  });
  const [proofFile, setProofFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { signup, sendVerificationEmail, error, setError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData((prev) => {
      let newData = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "sameAsPermanent") {
        if (checked) {
          newData.presentAddress = newData.permanentAddress;
        } else {
          newData.presentAddress = "";
        }
      }

      if (name === "permanentAddress" && newData.sameAsPermanent) {
        newData.presentAddress = value;
      }

      return newData;
    });

    if (error) setError("");
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (!file) {
      setProofFile(null);
      setErrors((prev) => ({
        ...prev,
        proofFile: "Proof of residency is required.",
      }));
      setFileError("Proof of residency is required.");
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    if (!allowedTypes.includes(file.type)) {
      const message = "Invalid file type. Accepted: JPG, PNG, JPEG, PDF.";
      setProofFile(null);
      setErrors((prev) => ({ ...prev, proofFile: message }));
      setFileError(message);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const message = "File size must not exceed 5MB.";
      setProofFile(null);
      setErrors((prev) => ({ ...prev, proofFile: message }));
      setFileError(message);
      return;
    }

    setProofFile(file);
    setErrors((prev) => ({ ...prev, proofFile: "" }));
    setFileError("");
  };

  const validateForm = () => {
    const newErrors = {};

    const nameValidation = validateName(formData.name);
    if (!nameValidation.isValid) {
      newErrors.name = nameValidation.error;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      newErrors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.error;
    }

    const confirmPasswordValidation = validateConfirmPassword(
      formData.password,
      formData.confirmPassword,
    );
    if (!confirmPasswordValidation.isValid) {
      newErrors.confirmPassword = confirmPasswordValidation.error;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadToCloudinary = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formData.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload proof. Please try again.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please fix the errors in the form.", "error");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const result = await signup(
        formData.email,
        formData.password,
        formData.name,
      );
      const { user } = result;

      // Send email verification link immediately after account creation
      await sendVerificationEmail();

      let proofUrl = "";
      if (proofFile) {
        proofUrl = await uploadToCloudinary(proofFile);
      }

      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.name,
        email: formData.email,
        birthday: formData.birthday,
        permanentAddress: formData.permanentAddress,
        presentAddress: formData.presentAddress,
        purok: formData.purok,
        contactNumber: formData.contactNumber,
        proofUrl,
        status: "emailUnverified",
        createdAt: serverTimestamp(),
      });

      // Notify all admins about the new registration
      try {
        const adminsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'admin')));
        if (!adminsSnap.empty) {
          const batch = writeBatch(db);
          adminsSnap.docs.forEach((adminDoc) => {
            const notifRef = doc(collection(db, 'notifications'));
            batch.set(notifRef, {
              userId: adminDoc.id,
              role: 'admin',
              title: 'New Registration',
              message: `${formData.name} has registered.`,
              type: 'resident',
              read: false,
              createdAt: serverTimestamp(),
              link: '/admin/residents',
            });
          });
          await batch.commit();
        }
      } catch (notifErr) {
        console.error('Error sending registration notification to admins:', notifErr);
      }

      showToast(
        "Account created! Please check your email to verify your address.",
        "success",
      );

      setTimeout(() => {
        navigate("/verify-email");
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);
      if (error.code === "auth/email-already-in-use") {
        showToast("This email is already registered.", "error");
        setErrors((prev) => ({
          ...prev,
          email: "This email is already registered.",
        }));
      } else if (error.code === "auth/invalid-email") {
        showToast("Please enter a valid email address.", "error");
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address.",
        }));
      } else if (error.code === "auth/weak-password") {
        showToast("Password is too weak.", "error");
        setErrors((prev) => ({ ...prev, password: "Password is too weak." }));
      } else if (error.message.includes("upload")) {
        showToast(error.message, "error");
      } else {
        showToast("Signup failed. Please try again.", "error");
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.password.trim() !== "" &&
    formData.confirmPassword.trim() !== "" &&
    formData.birthday.trim() !== "" &&
    formData.permanentAddress.trim() !== "" &&
    formData.presentAddress.trim() !== "" &&
    formData.purok.trim() !== "" &&
    formData.contactNumber.trim() !== "" &&
    !!proofFile &&
    !fileError;

  return (
    <div className="signup-container">
      <div className="signup-wrapper">
        {/* Left Side — Signup Form */}
        <div className="signup-form-section">
          <div className="signup-logo">
            <img src="/logo.png" alt="Barangay Mabayuan" />
          </div>

          <div className="signup-header">
            <h1 className="signup-title">Create Account</h1>
            <p className="signup-subtitle">
              Join the Barangay Mabayuan Information Center
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">
                <AlertTriangle size={16} strokeWidth={2} />
              </span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="signup-form">
            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <User size={14} strokeWidth={2} />
                </span>
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`form-input ${errors.name ? "input-error" : ""}`}
                placeholder="Enter your full name"
                disabled={loading}
              />
              {errors.name && (
                <span className="field-error">{errors.name}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <Calendar size={14} strokeWidth={2} />
                </span>
                Birthday
              </label>
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className={`form-input ${errors.birthday ? "input-error" : ""}`}
                disabled={loading}
              />
              {errors.birthday && (
                <span className="field-error">{errors.birthday}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <MapPin size={14} strokeWidth={2} />
                </span>
                Permanent Address
              </label>
              <input
                type="text"
                name="permanentAddress"
                value={formData.permanentAddress}
                onChange={handleChange}
                className={`form-input ${errors.permanentAddress ? "input-error" : ""}`}
                placeholder="Enter your full permanent address"
                disabled={loading}
              />
              {errors.permanentAddress && (
                <span className="field-error">{errors.permanentAddress}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <Home size={14} strokeWidth={2} />
                </span>
                Present Address
              </label>
              <input
                type="text"
                name="presentAddress"
                value={formData.presentAddress}
                onChange={handleChange}
                className={`form-input ${errors.presentAddress ? "input-error" : ""}`}
                placeholder="Enter your present address"
                disabled={loading || formData.sameAsPermanent}
              />
              <div style={{ marginTop: "10px", marginBottom: "5px" }}>
                <label className="checkbox-container" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "#4b5563", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    name="sameAsPermanent"
                    checked={formData.sameAsPermanent}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  Same as Permanent Address
                </label>
              </div>
              {errors.presentAddress && (
                <span className="field-error">{errors.presentAddress}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <MapPin size={14} strokeWidth={2} />
                </span>
                Purok
              </label>
              <select
                name="purok"
                value={formData.purok}
                onChange={handleChange}
                className={`form-input ${errors.purok ? "input-error" : ""}`}
                disabled={loading}
                required
              >
                <option value="" disabled>Select Purok</option>
                <option value="Purok 1">Purok 1</option>
                <option value="Purok 2">Purok 2</option>
                <option value="Purok 3">Purok 3</option>
                <option value="Purok 4">Purok 4</option>
                <option value="Purok 5">Purok 5</option>
                <option value="Purok 6">Purok 6</option>
                <option value="Purok 7">Purok 7</option>
              </select>
              {errors.purok && (
                <span className="field-error">{errors.purok}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <Phone size={14} strokeWidth={2} />
                </span>
                Contact Number
              </label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className={`form-input ${errors.contactNumber ? "input-error" : ""}`}
                placeholder="09XXXXXXXXX"
                disabled={loading}
              />
              {errors.contactNumber && (
                <span className="field-error">{errors.contactNumber}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <Mail size={14} strokeWidth={2} />
                </span>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? "input-error" : ""}`}
                placeholder="Enter your email"
                disabled={loading}
              />
              {errors.email && (
                <span className="field-error">{errors.email}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <Lock size={14} strokeWidth={2} />
                </span>
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input form-input-password ${errors.password ? "input-error" : ""}`}
                  placeholder="Create a password (min. 8 characters)"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <span className="field-error">{errors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <ShieldCheck size={14} strokeWidth={2} />
                </span>
                Confirm Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`form-input form-input-password ${errors.confirmPassword ? "input-error" : ""}`}
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="field-error">{errors.confirmPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">
                <span className="label-icon">
                  <Upload size={14} strokeWidth={2} />
                </span>
                Proof of Residency (JPG, PNG, PDF, max 5MB)
              </label>
              <div style={{ marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-guidelines-trigger"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Info size={14} strokeWidth={2} /> What documents are accepted?
                </button>
              </div>
              <input
                type="file"
                name="proofFile"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                className={`form-input ${errors.proofFile ? "input-error" : ""}`}
                disabled={loading}
              />
              {errors.proofFile && (
                <span className="field-error">{errors.proofFile}</span>
              )}
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <span className="btn-loading"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  <span className="btn-icon">
                    <ShieldCheck size={18} strokeWidth={2} />
                  </span>
                  Create Account
                </>
              )}
            </button>

            <div className="login-prompt">
              <p>
                Already have an account?{" "}
                <Link to="/login" className="login-link">
                  Login
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Divider */}
        <div className="signup-divider" />

        {/* Right Side — Info */}
        <div className="signup-info-section">
          <div className="signup-info-block signup-info-block--main">
            <h2 className="signup-info-block__title">
              <span className="signup-info-block__inline-icon">
                <Megaphone size={18} strokeWidth={1.8} />
              </span>{" "}
              Join Our Community
            </h2>
            <p className="signup-info-block__text">
              Create an account to access all the features of Barangay Mabayuan
              Information Center. Stay connected with your community and never
              miss important updates.
            </p>
          </div>

          <div className="signup-info-block">
            <h3 className="signup-info-block__title">
              <span className="signup-info-block__inline-icon">
                <Megaphone size={16} strokeWidth={1.8} />
              </span>{" "}
              Get Instant Updates
            </h3>
            <p className="signup-info-block__text">
              Receive real-time notifications about barangay announcements and
              events
            </p>
          </div>

          <div className="signup-info-block">
            <h3 className="signup-info-block__title">
              <span className="signup-info-block__inline-icon">
                <Bell size={16} strokeWidth={1.8} />
              </span>{" "}
              Emergency Alerts
            </h3>
            <p className="signup-info-block__text">
              Get immediate notifications during emergencies and important
              situations
            </p>
          </div>
        </div>
      </div>

      {/* Guidelines Modal */}
      {isModalOpen && (
        <div className="guidelines-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="guidelines-modal" onClick={e => e.stopPropagation()}>
            <div className="guidelines-modal-header">
              <h3 className="guidelines-modal-title">Proof of Residency — Accepted Documents</h3>
              <button type="button" className="guidelines-modal-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            <div className="guidelines-modal-body">
              <p className="guidelines-modal-intro">
                Please upload one of the following documents that clearly shows your full name and current address.
              </p>
              <ul className="guidelines-list">
                <li>
                  <CheckCircle size={18} strokeWidth={2} className="guidelines-list-icon" />
                  <div>
                    Barangay Certificate of Residency
                  </div>
                </li>

                <li>
                  <CheckCircle size={18} strokeWidth={2} className="guidelines-list-icon" />
                  <div>
                    Government-issued ID with home address
                    <span>(PhilSys ID, Voter's ID, Driver's License, Postal ID)</span>
                  </div>
                </li>
                <li>
                  <CheckCircle size={18} strokeWidth={2} className="guidelines-list-icon" />
                  <div>
                    Lease or Rental Contract (notarized or signed)
                  </div>
                </li>
                <li>
                  <CheckCircle size={18} strokeWidth={2} className="guidelines-list-icon" />
                  <div>
                    Land Title or Tax Declaration
                  </div>
                </li>
              </ul>
              <div className="guidelines-warning">
                <strong>⚠</strong> Blurry, cropped, or incomplete documents may cause delays or rejection of your verification request.
              </div>
            </div>
            <div className="guidelines-modal-footer">
              <button type="button" className="btn-modal-close" onClick={() => setIsModalOpen(false)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Signup;
