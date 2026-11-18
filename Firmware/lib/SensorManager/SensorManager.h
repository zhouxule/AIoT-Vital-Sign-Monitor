#ifndef SENSOR_MANAGER_H
#define SENSOR_MANAGER_H

#include <Arduino.h>

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize I2C bus and placeholder sensor drivers
 */
void Sensors_Init(void);

/**
 * @brief FreeRTOS Task entry for periodic environmental & thermal sensors read
 */
void Task_Sensors(void *pvParameters);

#ifdef __cplusplus
}
#endif

#endif // SENSOR_MANAGER_H
