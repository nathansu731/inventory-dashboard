import {WelcomeMessage} from "@/components/login-page/login-form/welcome-message";
import {EmailSection} from "@/components/login-page/login-form/email-section";
import {PasswordSection} from "@/components/login-page/login-form/password-section";
import {LoginButton} from "@/components/login-page/login-form/login-button";
import {ContinueWithSection} from "@/components/login-page/login-form/continue-with-section";
import {LoginWithOtherAccountBtns} from "@/components/login-page/login-form/login-with-other-account-btns";
import {DontHaveAccountSection} from "@/components/login-page/login-form/dont-have-account-section";

export const Form = () => {
    return (
        <form className="p-6 md:p-8">
            <div className="flex flex-col gap-6">
                <WelcomeMessage/>
                <EmailSection/>
                <PasswordSection/>
                <LoginButton/>
                <ContinueWithSection/>
                <LoginWithOtherAccountBtns/>
                <DontHaveAccountSection/>
            </div>
        </form>
    )
}