import * as React from "react";

import { cn } from "@/lib/utils";

const Select = ({ children, className }) => (
  <div className={cn("ui-select", className)}>{children}</div>
);

const SelectTrigger = React.forwardRef(
  ({ className, value, onValueChange, children, ...props }, ref) => (
    <select
      ref={ref}
      value={value}
      onChange={(event) => onValueChange?.(event.target.value)}
      className={cn("ui-select-trigger", className)}
      {...props}
    >
      {children}
    </select>
  )
);
SelectTrigger.displayName = "SelectTrigger";

const SelectContent = ({ children }) => <>{children}</>;

const SelectItem = ({ value, children }) => (
  <option value={value}>{children}</option>
);

export { Select, SelectTrigger, SelectContent, SelectItem };
