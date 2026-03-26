

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Please enter your email.' };
  }
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address.' };
  }
  return { isValid: true, error: '' };
};

export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return { isValid: false, error: 'Please enter your password.' };
  }
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters.' };
  }
  return { isValid: true, error: '' };
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword || confirmPassword.trim() === '') {
    return { isValid: false, error: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match.' };
  }
  return { isValid: true, error: '' };
};

export const validateName = (name) => {
  const nameRegex = /^[a-zA-Z\s]+$/;
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Please enter a name.' };
  }
  if (!nameRegex.test(name)) {
    return { isValid: false, error: 'Name can only contain letters and spaces.' };
  }
  return { isValid: true, error: '' };
};

export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^09\d{9}$/;
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Please enter a contact number.' };
  }
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: 'Contact number must be 11 digits (09XXXXXXXXX).' };
  }
  return { isValid: true, error: '' };
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, error: `${fieldName} is required.` };
  }
  return { isValid: true, error: '' };
};

export const validateDate = (date, allowPast = false) => {
  if (!date) {
    return { isValid: false, error: 'Please select a date.' };
  }
  
  if (!allowPast) {
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return { isValid: false, error: 'Date cannot be in the past.' };
    }
  }
  
  return { isValid: true, error: '' };
};

export const validateUrl = (url) => {
  if (!url || url.trim() === '') {
    return { isValid: true, error: '' }; 
  }
  
  try {
    new URL(url);
    return { isValid: true, error: '' };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL.' };
  }
};


export const checkDuplicate = (items, field, value, excludeId = null) => {
  const duplicate = items.find(item => 
    item[field]?.toLowerCase() === value?.toLowerCase() && 
    item.id !== excludeId
  );
  return duplicate !== undefined;
};
