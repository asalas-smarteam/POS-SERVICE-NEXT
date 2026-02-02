import * as React from "react";

import { cn } from "@/lib/utils";

const variantStyles = {
  default: "ui-button--default",
  outline: "ui-button--outline",
};

const Button = React.forwardRef(
  ({ className, variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn("ui-button", variantStyles[variant], className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button };
