import {Button} from "@/components/ui/button";


export const LogoutButton  = () => {

    const handleLogout = () => {
        window.location.href = "/api/auth/logout";
    };
    return (
     <Button onClick={handleLogout} size="sm" variant="default" className="p-3 text-[12px]">
         Logout
     </Button>
    )
}