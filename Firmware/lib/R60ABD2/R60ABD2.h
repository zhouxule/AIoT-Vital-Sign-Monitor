#ifndef R60ABD2_H
#define R60ABD2_H

#include <Arduino.h>
#include "system_data.h"

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize the hardware UART connection to R60ABD2 radar
 */
void R60ABD2_Init(void);

/**
 * @brief Parse incoming bytes from radar UART stream using protocol state machine
 * @param byte Single raw byte received from UART
 */
void R60ABD2_ProcessByte(uint8_t byte);

/**
 * @brief Send standard inquiry or control command to R60ABD2
 * @param control Control byte
 * @param command Command byte
 * @param data Optional payload pointer
 * @param len Payload length
 */
void R60ABD2_SendCommand(uint8_t control, uint8_t command, const uint8_t *data, uint16_t len);

/**
 * @brief FreeRTOS Task entry for Radar UART handling
 */
void Task_Radar(void *pvParameters);

#ifdef __cplusplus
}
#endif

#endif // R60ABD2_H
