#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <Arduino.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize Wi-Fi connection and optionally configure custom MAC address
 */
void Network_Init(void);

/**
 * @brief FreeRTOS Task entry for periodic HTTPS upload & config synchronization
 */
void Task_Network(void *pvParameters);

#ifdef __cplusplus
}
#endif

#endif // NETWORK_MANAGER_H
