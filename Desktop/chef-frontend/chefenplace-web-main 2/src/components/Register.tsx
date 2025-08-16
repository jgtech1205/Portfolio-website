'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ChefLogo } from './ChefLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type Locale } from '@/lib/i18n';
import { useAppDispatch } from '@/app/hooks';
import { setCredentials } from '@/features/auth/authSlice';
import { ChevronLeft, ChevronRight, Check, Building, User, CreditCard } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { API_BASE_URL } from '@/config/api';

interface RestaurantSignupProps {
  locale?: Locale;
}

interface SignupData {
  // Step 1: Restaurant Info
  restaurantName: string;
  restaurantType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  
  // Step 2: Head Chef Info
  headChefName: string;
  headChefEmail: string;
  headChefPassword: string;
  confirmPassword: string;
  
  // Step 3: Plan Selection
  planType: string;
  billingCycle: string;
}

const RESTAURANT_TYPES = [
  { value: 'fast-casual', label: 'Fast Casual' },
  { value: 'fine-dining', label: 'Fine Dining' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'food-truck', label: 'Food Truck' },
  { value: 'catering', label: 'Catering' },
  { value: 'other', label: 'Other' },
];

const PLANS = [
  {
    type: 'trial',
    name: 'Free Trial',
    price: { monthly: 0, yearly: 0 },
    features: ['14-day free trial', '10 recipes', '10 team members', 'Basic support'],
    popular: false,
  },
  {
    type: 'pro',
    name: 'Pro',
    price: { monthly: 49, yearly: 490 },
    features: ['200 recipes', '50 team members', 'Recipe QR codes', 'Advanced analytics', 'Priority support'],
    popular: true,
  },
  {
    type: 'enterprise',
    name: 'Enterprise',
    price: { monthly: 99, yearly: 990 },
    features: ['Unlimited recipes', 'Unlimited team members', 'Custom integrations', 'White-label options', 'Dedicated support'],
    popular: false,
  },
];

export function RestaurantSignup({ locale: _ }: RestaurantSignupProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SignupData>({
    restaurantName: '',
    restaurantType: 'other',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    headChefName: '',
    headChefEmail: '',
    headChefPassword: '',
    confirmPassword: '',
    planType: 'trial',
    billingCycle: 'monthly',
  });

  const updateData = (field: keyof SignupData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!data.restaurantName.trim()) {
          toast.error('Restaurant name is required');
          return false;
        }
        return true;
      case 2:
        if (!data.headChefName.trim()) {
          toast.error('Head chef name is required');
          return false;
        }
        if (!data.headChefEmail.trim()) {
          toast.error('Email is required');
          return false;
        }
        if (data.headChefPassword.length < 6) {
          toast.error('Password must be at least 6 characters');
          return false;
        }
        if (data.headChefPassword !== data.confirmPassword) {
          toast.error('Passwords do not match');
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleStripeCheckout = async (planType: string, billingCycle: string) => {
    try {
      // Check if Stripe key is available
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!stripeKey) {
        toast.error('Stripe configuration missing. Please contact support.');
        console.error('VITE_STRIPE_PUBLISHABLE_KEY is not defined');
        return;
      }

      // Initialize Stripe
      const stripe = await loadStripe(stripeKey);
      if (!stripe) {
        toast.error('Failed to load payment system');
        return;
      }

      // Create checkout session
      const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          billingCycle,
          restaurantName: data.restaurantName,
          headChefEmail: data.headChefEmail,
          headChefName: data.headChefName,
          headChefPassword: data.headChefPassword,
          restaurantType: data.restaurantType,
          location: {
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country,
          },
        }),
      });

      const session = await response.json();

      if (session.error) {
        toast.error('Failed to create checkout session');
        return;
      }

      // Redirect to Stripe checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        toast.error('Payment failed');
      }
    } catch (error) {
      console.error('Stripe checkout error:', error);
      toast.error('Payment system error');
    }
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/restaurant/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantName: data.restaurantName,
          restaurantType: data.restaurantType,
          location: {
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country,
          },
          headChefName: data.headChefName,
          headChefEmail: data.headChefEmail,
          headChefPassword: data.headChefPassword,
          planType: data.planType,
          billingCycle: data.billingCycle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed');
      }

      // Auto-login the user
      dispatch(setCredentials({
        user: result.data.user,
        accessToken: result.data.accessToken,
        refreshToken: result.data.refreshToken,
      }));

      toast.success('Restaurant created successfully! Welcome to Chef en Place!');
      navigate('/dashboard');

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <Building className="w-12 h-12 text-[#D4B896] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Restaurant Information</h2>
        <p className="text-slate-400">Tell us about your restaurant</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Restaurant Name *
        </label>
        <Input
          type="text"
          placeholder="e.g., Bella Italiana"
          value={data.restaurantName}
          onChange={(e) => updateData('restaurantName', e.target.value)}
          className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Restaurant Type
        </label>
        <select
          value={data.restaurantType}
          onChange={(e) => updateData('restaurantType', e.target.value)}
          className="w-full h-12 bg-slate-700 border border-slate-600 text-white rounded-md px-3"
        >
          {RESTAURANT_TYPES.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Address
          </label>
          <Input
            type="text"
            placeholder="Street address"
            value={data.address}
            onChange={(e) => updateData('address', e.target.value)}
            className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            City
          </label>
          <Input
            type="text"
            placeholder="City"
            value={data.city}
            onChange={(e) => updateData('city', e.target.value)}
            className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            State
          </label>
          <Input
            type="text"
            placeholder="State"
            value={data.state}
            onChange={(e) => updateData('state', e.target.value)}
            className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            ZIP Code
          </label>
          <Input
            type="text"
            placeholder="ZIP"
            value={data.zipCode}
            onChange={(e) => updateData('zipCode', e.target.value)}
            className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Country
          </label>
          <Input
            type="text"
            value={data.country}
            onChange={(e) => updateData('country', e.target.value)}
            className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <User className="w-12 h-12 text-[#D4B896] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Head Chef Account</h2>
        <p className="text-slate-400">Create your account as the head chef</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Full Name *
        </label>
        <Input
          type="text"
          placeholder="Your full name"
          value={data.headChefName}
          onChange={(e) => updateData('headChefName', e.target.value)}
          className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Email Address *
        </label>
        <Input
          type="email"
          placeholder="chef@restaurant.com"
          value={data.headChefEmail}
          onChange={(e) => updateData('headChefEmail', e.target.value)}
          className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Password *
        </label>
        <Input
          type="password"
          placeholder="At least 6 characters"
          value={data.headChefPassword}
          onChange={(e) => updateData('headChefPassword', e.target.value)}
          className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Confirm Password *
        </label>
        <Input
          type="password"
          placeholder="Confirm your password"
          value={data.confirmPassword}
          onChange={(e) => updateData('confirmPassword', e.target.value)}
          className="w-full h-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
          required
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <CreditCard className="w-12 h-12 text-[#D4B896] mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Plan</h2>
        <p className="text-slate-400">Start with a 14-day free trial</p>
      </div>

      <div className="mb-6">
        <div className="flex justify-center mb-6">
          <div className="bg-slate-800 rounded-lg p-1 flex">
            <button
              type="button"
              onClick={() => updateData('billingCycle', 'monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                data.billingCycle === 'monthly'
                  ? 'bg-[#D4B896] text-[#0F1A24]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => updateData('billingCycle', 'yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                data.billingCycle === 'yearly'
                  ? 'bg-[#D4B896] text-[#0F1A24]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Yearly (2 months free)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.type}
              onClick={() => updateData('planType', plan.type)}
              className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${
                data.planType === plan.type
                  ? 'border-[#D4B896] bg-[#D4B896]/10'
                  : 'border-slate-600 bg-slate-800 hover:border-slate-500'
              } ${plan.popular ? 'ring-2 ring-[#D4B896]/50' : ''}`}
            >
              {plan.popular && (
                <div className="text-center">
                  <span className="bg-[#D4B896] text-[#0F1A24] text-xs font-bold px-2 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}
              
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                <div className="text-3xl font-bold text-[#D4B896]">
                  {plan.price[data.billingCycle as keyof typeof plan.price] === 0 
                    ? 'Free' 
                    : `$${plan.price[data.billingCycle as keyof typeof plan.price]}`}
                </div>
                {plan.price[data.billingCycle as keyof typeof plan.price] > 0 && (
                  <div className="text-slate-400 text-sm">
                    per {data.billingCycle === 'monthly' ? 'month' : 'year'}
                  </div>
                )}
              </div>

              <ul className="space-y-2 text-sm text-slate-300">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <Check className="w-4 h-4 text-[#D4B896] mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Checkout Button */}
        {data.planType !== 'trial' && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={() => handleStripeCheckout(data.planType, data.billingCycle)}
              disabled={isLoading}
              className="bg-[#D4B896] text-[#0F1A24] px-8 py-3 rounded-lg font-semibold hover:bg-[#C4A886] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : `Subscribe to ${PLANS.find(p => p.type === data.planType)?.name} - $${PLANS.find(p => p.type === data.planType)?.price[data.billingCycle as keyof typeof PLANS[0]['price']]}/${data.billingCycle === 'monthly' ? 'month' : 'year'}`}
            </button>
            <p className="text-slate-400 text-sm mt-2">
              You'll be redirected to our secure payment processor
            </p>
          </div>
        )}

        {/* Continue Button for Trial */}
        {data.planType === 'trial' && (
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="bg-[#D4B896] text-[#0F1A24] px-8 py-3 rounded-lg font-semibold hover:bg-[#C4A886] transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating Account...' : 'Start Free Trial'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F1A24] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <ChefLogo />
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map(step => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep >= step
                      ? 'bg-[#D4B896] text-[#0F1A24]'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {currentStep > step ? <Check className="w-5 h-5" /> : step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      currentStep > step ? 'bg-[#D4B896]' : 'bg-slate-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-slate-800 rounded-2xl p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-3 bg-slate-700 text-white hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-[#D4B896] text-[#0F1A24] hover:bg-[#C4A886]"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-3 bg-[#D4B896] text-[#0F1A24] hover:bg-[#C4A886]"
              >
                {isLoading ? 'Creating Account...' : 'Create Restaurant'}
              </Button>
            )}
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-slate-400">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-[#D4B896] hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
