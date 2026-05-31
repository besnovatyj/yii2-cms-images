/*
 * Copyright (c) 2026 Besnovatyj. Licensed under the MIT License.
 */

import Dispatcher from "@/Dispatcher";

export class ControlsComponent extends HTMLElement {
    private uploadBtn: HTMLButtonElement;
    private clearBtn: HTMLButtonElement;

    constructor(private dispatcher: Dispatcher) {
        super();
        this.attachShadow({ mode: 'open' });
        this.render();
        this.uploadBtn = this.shadowRoot!.querySelector('#gallery-upload-btn')!;
        this.clearBtn = this.shadowRoot!.querySelector('#gallery-clear-btn')!;
        this.setupEventListeners();
    }

    private render() {
        this.shadowRoot!.innerHTML = `
            <style>
                .controls-container {
                    display: flex;
                    gap: 8px;
                    padding: 10px 0 2px;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    font-size: 13px;
                    font-weight: 500;
                    border: none;
                    border-radius: 7px;
                    cursor: pointer;
                    transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
                    line-height: 1;
                    letter-spacing: 0.01em;
                }
                .btn:active {
                    transform: scale(0.97);
                }
                .btn-upload {
                    background: #4f7df3;
                    color: #fff;
                    box-shadow: 0 1px 3px rgba(79,125,243,0.35);
                }
                .btn-upload:hover {
                    background: #3b6de0;
                    box-shadow: 0 3px 8px rgba(79,125,243,0.45);
                }
                .btn-clear {
                    background: #f3f4f6;
                    color: #6b7280;
                    border: 1px solid #e5e7eb;
                    padding: 6px 14px;
                }
                .btn-clear:hover {
                    background: #e9eaec;
                    color: #4b5563;
                }
                svg {
                    flex-shrink: 0;
                }
            </style>
            <div class="controls-container">
                <button id="gallery-upload-btn" type="button" class="btn btn-upload">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
                    </svg>
                    Загрузить
                </button>
                <button id="gallery-clear-btn" type="button" class="btn btn-clear">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>
                    </svg>
                    Очистить
                </button>
            </div>
        `;
    }

    private setupEventListeners() {
        this.uploadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish('VIEW.UPLOAD_CLICKED');
        });
        this.clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.dispatcher.publish('VIEW.CLEAR_CLICKED');
        });
    }
}

// Регистрируем веб-компонент
customElements.define('controls-component', ControlsComponent);
