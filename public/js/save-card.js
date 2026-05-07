const stripe = Stripe(
  'pk_test_51QIcysJa2uJRdqMjOB2IPcIj5j4bRpi8FI5AdVLLD3L3tyyWqtD8Yprw94ifNMuZRBfmgTp4F4tERFo5jhe8kmIV00WDVCxacB',
);

// Elements init
const elements = stripe.elements();
const card = elements.create('card', {
  style: {
    base: {
      fontSize: '16px',
      color: '#111827',
      fontFamily: 'Arial, sans-serif',
      '::placeholder': {
        color: '#9CA3AF',
      },
    },
    invalid: {
      color: '#EF4444',
    },
  },
});

card.mount('#card-element');

// DOM
const form = document.getElementById('payment-form');
const errorDiv = document.getElementById('error-message');
const saveBtn = document.querySelector('.save-btn');

// submit handler
form.addEventListener('submit', async e => {
  e.preventDefault();

  const clientSecret = document.getElementById('clientSecret').value;
  const customerId = document.getElementById('customerId').value;

  saveBtn.disabled = true;
  saveBtn.textContent = 'Processing...';
  errorDiv.textContent = '';

  try {
    const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card,
      },
    });

    if (error) {
      errorDiv.textContent = error.message;
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Card';
      return;
    }

    if (!setupIntent?.payment_method) {
      throw new Error('Payment method not created');
    }

    const res = await fetch('/api/v1/stripe/payment-method/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethodId: setupIntent.payment_method,
        customerId,
      }),
    });

    // const data = await res.json();

    // if (!res.ok) {
    //   throw new Error(data?.message || 'Failed to save card');
    // }

    // window.location.href = data?.url;
  } catch (err) {
    errorDiv.textContent = err.message;
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Card';
  }
});
