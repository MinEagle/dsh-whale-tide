/**
 * Host half of dsh-whale-tide.
 *
 * Everything visual lives in the browser bundle (`./client`). This row exists
 * so the plugin has an activate/disable switch in the Plugins page; it
 * registers no Host service and reads no configuration.
 */

export const name = "dsh-whale-tide";

export function apply() {}
