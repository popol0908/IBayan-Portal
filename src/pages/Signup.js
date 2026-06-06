import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TermsModal, PrivacyModal } from "../components/LegalModals";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  validateName,
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
  Bell,
  Info,
  X,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft
} from '../components/Icons';
import "./Signup.css";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dypfxfpfz";
const CLOUDINARY_UPLOAD_PRESET = "barangay_proofs";

const Signup = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    birthday: "",
    permanentAddress: "",
    presentAddress: "",
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
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const { signup, sendVerificationEmail, error, setError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

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

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      const nameValidation = validateName(formData.name);
      if (!nameValidation.isValid) newErrors.name = nameValidation.error;

      if (!formData.birthday) {
        newErrors.birthday = "Birthday is required.";
      } else {
        const birthDate = new Date(formData.birthday);
        const today = new Date();
        if (birthDate > today) {
          newErrors.birthday = "Birthday cannot be in the future.";
        } else {
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
          if (age < 18) newErrors.birthday = "You must be at least 18 years old to register.";
        }
      }

      if (!formData.purok) newErrors.purok = "Purok is required.";
    }

    if (step === 2) {
      if (!formData.permanentAddress.trim()) newErrors.permanentAddress = "Permanent Address is required.";
      if (!formData.presentAddress.trim()) newErrors.presentAddress = "Present Address is required.";
    }

    if (step === 3) {
      if (!formData.contactNumber.trim()) newErrors.contactNumber = "Contact number is required.";
      
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) newErrors.email = emailValidation.error;

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) newErrors.password = passwordValidation.error;

      const confirmPasswordValidation = validateConfirmPassword(formData.password, formData.confirmPassword);
      if (!confirmPasswordValidation.isValid) newErrors.confirmPassword = confirmPasswordValidation.error;
    }

    if (step === 4) {
      if (!proofFile) {
        newErrors.proofFile = "Proof of residency is required.";
      } else if (fileError) {
        newErrors.proofFile = fileError;
      }
    }

    setErrors(prev => ({...prev, ...newErrors}));
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      showToast("Please fill in all required fields correctly.", "error");
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const uploadToCloudinary = async (file) => {
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      formDataUpload.append("cloud_name", CLOUDINARY_CLOUD_NAME);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
        {
          method: "POST",
          body: formDataUpload,
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

    if (!validateStep(5)) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Validate Duplicate Account (Contact/Email)
      const usersRef = collection(db, "users");
      const emailQuery = query(usersRef, where("email", "==", formData.email));
      const contactQuery = query(usersRef, where("contactNumber", "==", formData.contactNumber));
      
      const [emailSnap, contactSnap] = await Promise.all([
        getDocs(emailQuery),
        getDocs(contactQuery)
      ]);

      if (!emailSnap.empty || !contactSnap.empty) {
        setLoading(false);
        showToast("This email/contact number is already linked to an existing account.", "error");
        setCurrentStep(3);
        return;
      }

      // Validate Duplicate Resident (Full Name + DOB)
      // Query by birthday to make it efficient, then check name case-insensitively
      const dobQuery = query(usersRef, where("birthday", "==", formData.birthday));
      const dobSnap = await getDocs(dobQuery);
      
      const isDuplicateResident = dobSnap.docs.some(doc => {
        const data = doc.data();
        return data.fullName && data.fullName.trim().toLowerCase() === formData.name.trim().toLowerCase();
      });

      if (isDuplicateResident) {
        setLoading(false);
        showToast("A resident with this Full Name and Date of Birth is already registered.", "error");
        setCurrentStep(1);
        return;
      }

      const result = await signup(
        formData.email,
        formData.password,
        formData.name,
      );
      const { user } = result;

      await sendVerificationEmail();

      let proofUrl = "";
      if (proofFile) {
        proofUrl = await uploadToCloudinary(proofFile);
      }

      const fullPresentAddress = `${formData.presentAddress}, Mabayuan, Olongapo City, Philippines`;

      await setDoc(doc(db, "users", user.uid), {
        fullName: formData.name,
        email: formData.email,
        birthday: formData.birthday,
        permanentAddress: formData.permanentAddress,
        presentAddress: fullPresentAddress,
        purok: formData.purok,
        contactNumber: formData.contactNumber,
        proofUrl,
        status: "emailUnverified",
        createdAt: serverTimestamp(),
      });

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
        setCurrentStep(3); // Go back to email step
      } else if (error.code === "auth/invalid-email") {
        showToast("Please enter a valid email address.", "error");
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address.",
        }));
        setCurrentStep(3);
      } else if (error.code === "auth/weak-password") {
        showToast("Password is too weak.", "error");
        setErrors((prev) => ({ ...prev, password: "Password is too weak." }));
        setCurrentStep(3);
      } else if (error.message.includes("upload")) {
        showToast(error.message, "error");
        setCurrentStep(4); // Go back to upload step
      } else {
        showToast("Signup failed. Please try again.", "error");
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate the max date (must be at least 18 years old)
  const todayDate = new Date();
  const maxBirthdayDate = new Date(todayDate.getFullYear() - 18, todayDate.getMonth(), todayDate.getDate()).toISOString().split('T')[0];

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

          <div className="signup-progress">
            <div className="progress-text">Step {currentStep} of 5</div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${(currentStep / 5) * 100}%` }}></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="signup-form">
            
            {/* STEP 1: Personal Information */}
            {currentStep === 1 && (
              <div className="form-step slide-in">
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
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    max={maxBirthdayDate}
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
                    Purok
                  </label>
                  <select
                    name="purok"
                    value={formData.purok}
                    onChange={handleChange}
                    className={`form-input ${errors.purok ? "input-error" : ""}`}
                    disabled={loading}
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
              </div>
            )}

            {/* STEP 2: Address Details */}
            {currentStep === 2 && (
              <div className="form-step slide-in">
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
                  <div className="address-input-group">
                    <input
                      type="text"
                      name="presentAddress"
                      value={formData.presentAddress}
                      onChange={handleChange}
                      className={`form-input address-prefix-input ${errors.presentAddress ? "input-error" : ""}`}
                      placeholder="House No. / Street / Purok"
                      disabled={loading}
                    />
                    <span className="address-suffix">, Mabayuan, Olongapo City, Philippines</span>
                  </div>
                  {errors.presentAddress && (
                    <span className="field-error">{errors.presentAddress}</span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 3: Contact & Account */}
            {currentStep === 3 && (
              <div className="form-step slide-in">
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
              </div>
            )}

            {/* STEP 4: Proof of Residency */}
            {currentStep === 4 && (
              <div className="form-step slide-in">
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
                  <p className="no-id-note">
                    Don't have an ID or accepted document? Please visit the Barangay Mabayuan Hall for assistance with your registration.
                  </p>
                  {errors.proofFile && (
                    <span className="field-error">{errors.proofFile}</span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Review & Confirm */}
            {currentStep === 5 && (
              <div className="form-step slide-in">
                <div className="summary-container">
                  <div className="summary-section">
                    <h4 className="summary-title">Personal Information</h4>
                    <div className="summary-row">
                      <span className="summary-label">Full Name</span>
                      <span className="summary-value">{formData.name}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Date of Birth</span>
                      <span className="summary-value">{formData.birthday}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Purok</span>
                      <span className="summary-value">{formData.purok}</span>
                    </div>
                  </div>

                  <div className="summary-section">
                    <h4 className="summary-title">Address</h4>
                    <div className="summary-row">
                      <span className="summary-label">Permanent Address</span>
                      <span className="summary-value">{formData.permanentAddress}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Present Address</span>
                      <span className="summary-value">{formData.presentAddress}, Mabayuan, Olongapo City, Philippines</span>
                    </div>
                  </div>

                  <div className="summary-section">
                    <h4 className="summary-title">Contact</h4>
                    <div className="summary-row">
                      <span className="summary-label">Contact Number</span>
                      <span className="summary-value">{formData.contactNumber}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Email Address</span>
                      <span className="summary-value">{formData.email}</span>
                    </div>
                  </div>
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

                <div className="form-options terms-options">
                  <label className="checkbox-container terms-checkbox-container">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      disabled={loading}
                    />
                    <span className="terms-text">
                      I agree to the <button type="button" className="text-link" onClick={() => setShowTermsModal(true)}>Terms & Conditions</button> and <button type="button" className="text-link" onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Form Actions */}
            <div className="multi-step-actions">
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleBack}
                  disabled={loading}
                >
                  <ChevronLeft size={18} /> Back
                </button>
              )}
              
              {currentStep < 5 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNext}
                >
                  Next <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn btn-primary btn-submit-step"
                  disabled={loading || !agreedToTerms}
                >
                  {loading ? (
                    <>
                      <span className="btn-loading"></span>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} strokeWidth={2} />
                      Create Account
                    </>
                  )}
                </button>
              )}
            </div>

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

        {/* Left Side — Branded Info Panel */}
        <div className="signup-info-section">
          <div className="signup-info-backdrop">
            <img src="/logo.png" alt="" className="signup-info-bg-logo" />
          </div>
          <div className="signup-info-content">
            <div className="signup-info-brand">
              <img src="/logo.png" alt="iBayan" className="signup-info-logo" />
              <h2 className="signup-info-title">iBayan Portal</h2>
              <p className="signup-info-tagline">Barangay Mabayuan Information Center</p>
            </div>
            <div className="signup-info-features">
              <div className="signup-info-feature">
                <Megaphone size={18} strokeWidth={1.8} />
                <div>
                  <strong>Community Updates</strong>
                  <span>Real-time announcements & emergency alerts</span>
                </div>
              </div>
              <div className="signup-info-feature">
                <ShieldCheck size={18} strokeWidth={1.8} />
                <div>
                  <strong>Verified Residents</strong>
                  <span>Secure identity verification for all members</span>
                </div>
              </div>
              <div className="signup-info-feature">
                <Bell size={18} strokeWidth={1.8} />
                <div>
                  <strong>Event Notifications</strong>
                  <span>Never miss barangay events & programs</span>
                </div>
              </div>
            </div>
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

      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
      <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
    </div>
  );
};

export default Signup;
