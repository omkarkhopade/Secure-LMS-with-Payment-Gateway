import { api } from './api';
let razorpayScript;
function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScript) return razorpayScript;
  razorpayScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timer = setTimeout(() => {
      script.remove();
      razorpayScript = null;
      reject(new Error('Payment window could not load. Please try again.'));
    }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      razorpayScript = null;
      reject(new Error('Payment window could not load. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return razorpayScript;
}
export async function checkout(provider, course, user) {
  if (provider === 'stripe') {
    const response = await api('/purchase/checkout/create-checkout-session', {
      method: 'POST',
      body: { courseId: course._id },
    });
    const url = new URL(response.data.checkoutUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com')
      throw new Error('The payment destination could not be verified.');
    window.location.assign(url.href);
    return;
  }
  await loadRazorpay();
  const response = await api('/razorpay/create-order', {
    method: 'POST',
    body: { courseId: course._id },
  });
  return new Promise((resolve, reject) => {
    let submitting = false;
    const payment = new window.Razorpay({
      key: response.keyId,
      order_id: response.order.id,
      amount: response.order.amount,
      currency: response.order.currency,
      name: 'Forma',
      description: course.title,
      prefill: { name: user.name, email: user.email },
      theme: { color: '#203e35' },
      handler: async (data) => {
        submitting = true;
        try {
          await api('/razorpay/verify-payment', { method: 'POST', body: data });
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          if (!submitting)
            reject(new Error('Checkout closed. You can return whenever you’re ready.'));
        },
      },
    });
    payment.on('payment.failed', () => {
      payment.close();
      reject(new Error('Payment was not completed. Please try another payment method.'));
    });
    payment.open();
  });
}
export const paymentProviders = (import.meta.env?.VITE_PAYMENT_PROVIDERS ?? 'razorpay,stripe')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => ['razorpay', 'stripe'].includes(s));
