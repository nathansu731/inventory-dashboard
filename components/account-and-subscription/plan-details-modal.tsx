import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "@/components/ui/dialog";
import {ModalStep, planDetails, PlanType} from "@/components/account-and-subscription/plan-details-types";
import {Badge} from "@/components/ui/badge";
import {ArrowRight, Calendar, Check, CreditCard, Lock, Shield, Star} from "lucide-react";
import {Button} from "@/components/ui/button";
import {handleSubscribeTeam} from "@/components/handle-subscriptions/handle-subscribe-team";

type PlanDetailsModalProps = {
    isModalOpen: boolean,
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
    selectedPlan: PlanType | null,
    modalStep: ModalStep,
    handleProceedToPayment: () => void,
    handleCloseModal: () => void,
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
                                    <div className="p-6 border border-border rounded-lg text-center">
                                        <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                                            <CreditCard className="h-5 w-5 text-white" />
                                        </div>
                                        <h3 className="font-semibold mb-2">Pay with Card</h3>
                                        <p className="text-sm text-muted-foreground">
                                            You&apos;ll be redirected to Stripe Checkout to securely enter your card details.
                                        </p>
                                    </div>
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
                                            Proceed to Payment
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
