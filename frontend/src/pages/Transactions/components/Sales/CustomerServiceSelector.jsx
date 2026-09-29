import { useEffect, useRef, useState } from "react";

import { Plus } from "lucide-react";

import {
  createCustomerService,
  getCustomerServices,
} from "../../../../services/customerServiceService";

import styles from "./CustomerServiceSelector.module.css";

export default function CustomerServiceSelector({ value, amount, onChange }) {
  const [query, setQuery] = useState(value?.description || "");

  const [services, setServices] = useState([]);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [creating, setCreating] = useState(false);

  const wrapperRef = useRef(null);

  /*
   * Keep input synchronized with
   * the selected service.
   */

  useEffect(() => {
    if (value?.description) {
      setQuery(value.description);
    } else if (!value) {
      setQuery("");
    }
  }, [value]);

  /*
   * Close dropdown when clicking outside.
   */

  useEffect(() => {
    function handleOutsideClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /*
   * Load ALL company services.
   *
   * There is no customerId here.
   */

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        setLoading(true);

        const response = await getCustomerServices();

        if (cancelled) {
          return;
        }

        setServices(response?.data?.services || response?.services || []);
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load services:", error);

          setServices([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * Filter the company-wide service list
   * locally while typing.
   */

  const filteredServices = services.filter((service) =>
    String(service.service_name || "")
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  /*
   * Select an existing service.
   */

  function selectService(service) {
    setQuery(service.service_name);

    setOpen(false);

    onChange({
      customerServiceId: service.id,

      description: service.service_name,

      amount: service.default_amount ?? amount ?? "",
    });
  }

  /*
   * Create a new company-wide service.
   */

  async function createService() {
    const serviceName = query.trim();

    if (!serviceName || creating) {
      return;
    }

    try {
      setCreating(true);

      const response = await createCustomerService({
        service_name: serviceName,

        default_amount: Number(amount) || 0,
      });

      const service = response?.data?.service || response?.service;

      if (!service) {
        throw new Error("Unable to create service.");
      }

      /*
       * Add the newly-created service
       * to the local company-wide list.
       */

      setServices((current) => {
        const exists = current.some(
          (item) => Number(item.id) === Number(service.id),
        );

        if (exists) {
          return current;
        }

        return [...current, service];
      });

      setQuery(service.service_name);

      setOpen(false);

      onChange({
        customerServiceId: service.id,

        description: service.service_name,

        amount: service.default_amount ?? amount ?? "",
      });
    } catch (error) {
      console.error("Service creation failed:", error);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <input
        type="text"
        value={query}
        placeholder="Search or add service..."
        onChange={(event) => {
          const newValue = event.target.value;

          setQuery(newValue);

          /*
           * Typing clears the
           * previous selection.
           */

          onChange(null);

          setOpen(true);
        }}
        onFocus={() => {
          /*
           * Clicking the field
           * immediately shows all
           * company services.
           */

          setOpen(true);
        }}
        autoComplete="off"
      />

      {open && (
        <div className={styles.dropdown}>
          {loading && <div className={styles.message}>Loading services...</div>}

          {!loading &&
            filteredServices.map((service) => (
              <button
                type="button"
                key={service.id}
                className={styles.result}
                onClick={() => selectService(service)}
              >
                <span>{service.service_name}</span>

                <small>
                  AED {Number(service.default_amount || 0).toFixed(2)}
                </small>
              </button>
            ))}

          {!loading && filteredServices.length === 0 && !query.trim() && (
            <div className={styles.message}>No services available.</div>
          )}

          {!loading &&
            query.trim() &&
            !filteredServices.some(
              (service) =>
                String(service.service_name || "")
                  .trim()
                  .toLowerCase() === query.trim().toLowerCase(),
            ) && (
              <button
                type="button"
                className={styles.addButton}
                disabled={creating}
                onClick={createService}
              >
                <Plus size={16} />

                <span>{creating ? "Adding..." : `Add "${query.trim()}"`}</span>
              </button>
            )}
        </div>
      )}
    </div>
  );
}
