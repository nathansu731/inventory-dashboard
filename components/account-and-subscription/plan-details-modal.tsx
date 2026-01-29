import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {ModalStep, planDetails, PlanType} from "@/components/account-and-subscription/plan-details-types";
import {Badge} from "@/components/ui/badge";
import {ArrowRight, Calendar, Check, CreditCard, Lock, Shield, Star} from "lucide-react";
import {Button} from "@/components/ui/button";
import type React from "react";
import {handleSubscribeTeam} from "@/components/handle-subscriptions/handle-subscribe-team";

type PlanDetailsModalProps = {
    isModalOpen: boolean,
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
    selectedPlan: PlanType | null,
    modalStep: ModalStep,
    handleProceedToPayment: () => void,
    handleCloseModal: () => void,
    setPaymentMethod: React.Dispatch<React.SetStateAction<"card" | "paypal">>,
    paymentMethod: "card" | "paypal",
    handleBackToPlan: () => void,
    customerEmail?: string,
    customerId?: string,
}

export const PlanDetailsModal = ({
     isModalOpen,
     setIsModalOpen,
     selectedPlan,
     modalStep,
     handleProceedToPayment,
     handleCloseModal,
     setPaymentMethod,
     paymentMethod,
     handleBackToPlan,
     customerEmail,
     customerId,
     }: PlanDetailsModalProps) => {
    return (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                {selectedPlan && (
                    <>
                        {modalStep === "plan-details" && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-2xl">
                                        {planDetails[selectedPlan].icon}
                                        {planDetails[selectedPlan].name} Plan
                                        {planDetails[selectedPlan].popular && (
                                            <Badge className="bg-primary text-primary-foreground ml-2">
                                                <Star className="h-3 w-3 mr-1" />
                                                Popular
                                            </Badge>
                                        )}
                                    </DialogTitle>
                                    <DialogDescription className="text-lg">{planDetails[selectedPlan].description}</DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                                        <div>
                                            <h3 className="font-semibold text-lg">Monthly Price</h3>
                                            <p className="text-muted-foreground">Billed monthly, cancel anytime</p>
                                        </div>
                                        <div className="text-3xl font-bold text-primary">
                                            {planDetails[selectedPlan].price}
                                            <span className="text-sm font-normal text-muted-foreground">/month</span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Check className="h-5 w-5 text-primary" />
                                            What&apos;s included
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {planDetails[selectedPlan].features.map((feature, index) => (
                                                <div key={index} className="flex items-center gap-2">
                                                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                                    <span className="text-sm">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                            <Shield className="h-5 w-5 text-primary" />
                                            <div>
                                                <p className="font-medium text-sm">Secure & Reliable</p>
                                                <p className="text-xs text-muted-foreground">99.9% uptime SLA</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            <div>
                                                <p className="font-medium text-sm">Monthly Billing</p>
                                                <p className="text-xs text-muted-foreground">Cancel anytime</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                            <div>
                                                <p className="font-medium text-sm">Easy Billing</p>
                                                <p className="text-xs text-muted-foreground">Cancel anytime</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button className="flex-1" onClick={handleProceedToPayment}>
                                            Continue to Payment
                                            <ArrowRight className="h-4 w-4 ml-2" />
                                        </Button>
                                        <Button variant="outline" onClick={handleCloseModal}>
                                            Maybe Later
                                        </Button>
                                    </div>

                                    <p className="text-xs text-muted-foreground text-center">
                                        You can upgrade, downgrade, or cancel your subscription at any time from your account settings.
                                    </p>
                                </div>
                            </>
                        )}
                        {modalStep === "payment" && (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-2xl">
                                        <CreditCard className="h-6 w-6" />
                                        Complete Your Subscription
                                    </DialogTitle>
                                    <DialogDescription>
                                        Secure payment powered by Stripe. Your subscription will start immediately.
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-6">
                                    {/* Order Summary */}
                                    <div className="p-4 bg-muted rounded-lg">
                                        <h3 className="font-semibold mb-3">Order Summary</h3>
                                        <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center gap-2">
                          {planDetails[selectedPlan].icon}
                            {planDetails[selectedPlan].name} Plan
                        </span>
                                            <span className="font-semibold">{planDetails[selectedPlan].price}/month</span>
                                        </div>
                                        <div className="flex items-center justify-between font-semibold">
                                            <span>Due today</span>
                                            <span>{planDetails[selectedPlan].price}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Billed monthly until you cancel.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold mb-4">Payment Method</h3>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <button
                                                onClick={() => setPaymentMethod("card")}
                                                className={`p-3 border rounded-lg flex items-center gap-2 transition-colors ${
                                                    paymentMethod === "card"
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                }`}
                                            >
                                                <CreditCard className="h-4 w-4" />
                                                <span className="text-sm font-medium">Credit Card</span>
                                            </button>
                                            <button
                                                onClick={() => setPaymentMethod("paypal")}
                                                className={`p-3 border rounded-lg flex items-center gap-2 transition-colors ${
                                                    paymentMethod === "paypal"
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:border-primary/50"
                                                }`}
                                            >
                                                <div className="w-4 h-4 bg-blue-600 rounded-sm flex items-center justify-center">
                                                    <span className="text-white text-xs font-bold">P</span>
                                                </div>
                                                <span className="text-sm font-medium">PayPal</span>
                                            </button>
                                        </div>
                                    </div>
                                    {paymentMethod === "card" && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Card Number</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="1234 5678 9012 3456"
                                                        className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    />
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex gap-1">
                                                        <div className="w-6 h-4 bg-blue-600 rounded-sm"></div>
                                                        <div className="w-6 h-4 bg-red-600 rounded-sm"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Expiry Date</label>
                                                    <input
                                                        type="text"
                                                        placeholder="MM/YY"
                                                        className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">CVC</label>
                                                    <input
                                                        type="text"
                                                        placeholder="123"
                                                        className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-2">Cardholder Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="John Doe"
                                                    className="w-full p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {paymentMethod === "paypal" && (
                                        <div className="p-6 border border-border rounded-lg text-center">
                                            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-white text-2xl font-bold">P</span>
                                            </div>
                                            <h3 className="font-semibold mb-2">Pay with PayPal</h3>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                You&apos;ll be redirected to PayPal to complete your payment securely.
                                            </p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <Lock className="h-4 w-4 text-green-600" />
                                        <span className="text-sm text-green-800">Your payment information is encrypted and secure</span>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button variant="outline" onClick={handleBackToPlan} className="flex-1 bg-transparent">
                                            Back to Plan
                                        </Button>
                                        <Button
                                            className="flex-1"
                                            onClick={() =>
                                                handleSubscribeTeam({
                                                    priceId: planDetails[selectedPlan].priceId,
                                                    customerEmail,
                                                    clientReferenceId: customerId,
                                                    metadata: {
                                                        plan: planDetails[selectedPlan].name,
                                                        plan_interval: planDetails[selectedPlan].interval,
                                                        email: customerEmail || "",
                                                    },
                                                })
                                            }
                                        >
                                            {paymentMethod === "paypal" ? "Continue with PayPal" : "Proceed to Checkout"}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center">
                                        By continuing, you agree to our Terms of Service and Privacy Policy. You can cancel your
                                        subscription at any time.
                                    </p>
                                </div>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
