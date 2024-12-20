# Openhab Thermostat Scheduler

A simple web application for managing thermostat schedules using OpenHAB REST API. This project enables users to create, modify, and delete schedules for a smart thermostat using a graphical interface. The application communicates with an OpenHAB server through HTTP requests to manage scheduling rules. Various setpoints are set as OpenHAB rules, so it is also possible to verify them in OH interface itself.

For very long time I was using OpenHab timeline picker ( https://gitlab.com/RNTs_3/openhab-timeline-picker) and there were few things which were annoying for me:
* First one was lack of precison
* Second one was setting switchpoints on phone

Features

* **Add, edit, and delete schedules**: Easily manage thermostat schedules by interacting with the OpenHAB REST API.
* **Visual Scheduler**: A graphical interface allows for easy visualization and management of daily schedules
* **Real-Time Updates**: Fetches and updates schedules in real-time, ensuring changes are immediately reflected.
