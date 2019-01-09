/* Методы API


GET /status

Возвращает HTTP статус 200 и объект в формате json, содержащий информацию о состоянии всех ботов

{
	color:{
		name:'red',   			// имя сервера
		active:true,  			// активен ли сервер
		lastPolled:0,			// timestamp последнего опроса в мс
		lastRequest:0,			// timestamp последнего запроса в обход steamAPI в мс
		lastAPIRequest:0,		// timestamp последнего запроса к steamAPI в мс
		lastError:{},			// последняя ошибка, объект error 
		bots:{}
	},	
	... ,
}

или HTTP статус 500 и объект error в формате json.

Информация обновляется каждые 5 секунд.


GET /trade/:color/:botid/:tradeid

Возвращает HTTP статус 200 и объект в формате json

{
	
	offerID: 0,  		// идентификатор оффера
	state: '',			// состояние оффера
	newItems: []		// опциональный параметр. Возвращает массив объектов CEconItem https://github.com/DoctorMcKay/node-steamcommunity/wiki/CEconItem
						// в случае, если трейд был на депозит.
						// AssetID в этом объекте скорее всего будут новыми, их нужно апдейтнуть в базе в соответствии с markethashname вещей.
	
} 

Список значений state

	invalid — Трейд не валиден
	pending — оффер ожидает действия со стороны игрока
	completed — завершен, в случае трейда на вывод трейд можно считать завершенным, в случае трейда на депозит проверить параметр newItems, при наличии трейд считать завершенным, при отсутствии повторно запросить состояние оффера.
	counter — Контроффер, нештатная ситуация, возможно абуз со стороны игрока. Вещи могут быть де факто переданы в таком случае. Вещи нужно в любом случае убирать из инвентаря.
	expired — Время истекло, оффер не состоялся. Равносильно отмене трейда.
	cancelled — Оффер отменен ботом. Равносильно отмене трейда.
	declined — Оффер отменен игроком. Равносильно отмене трейда.
	obsolete — Оффер сформирован неправильно. Равносильно отмене трейда.
	conf_pending — оффер ожидает мобильного подтверждения, равносильно pending
	conf_declined — Оффер был отменен через мобильное подтверждение. Равносильно отмене трейда.
	confirmed — Сервисное сообщение, означает подтверждение через мобильный аутентификатор. Не предполагает никаких действий.
	escrowed — Нештатная ситуация, трейд перешёл в состояние escrow. Обмен будет завершён через значительный промежуток времени.
	
Что делаем

	invalid — Опрашиваем дальше
	pending — Опрашиваем дальше
	completed — завершен, в случае трейда на вывод трейд можно считать завершенным, в случае трейда на депозит проверить параметр newItems, при наличии трейд считать завершенным, при отсутствии повторно запросить состояние оффера.
	counter — Убираем вещи из инвентаря со статусом counter
	expired — Отмена
	cancelled — Отмена
	declined — Отмена
	obsolete — Отмена
	conf_pending — Опрашиваем дальше, посылаем на фронтэнд сообщение Pending mobile confirmation
	conf_declined — Отмена
	confirmed — Опрашиваем дальше
	escrowed — Тревога, нештатная ситуация. Нужно как-то проинформировать администратора.
	
или HTTP статус 400 и объект error в формате json в случае неправильно сформированного запроса
или HTTP статус 406 и объект error в формате json в случае некритичной ошибки
или HTTP статус 500 и объект error в формате json в случае серьёзной ошибки

POST /deposit

Принимает такой объект

{

    steamid: '', // steamid пользователя
    token: '',   // token из трейдлинка пользователя  
    assets: [1, 2, 3, ... ],   // массив с assetid вещей, помещаемых на депозит
    
}

Возвращает HTTP статус 200 и объект в формате json. Объект содержит данные о попытке создания каждого трейд оффера


    {
    
        color:  '',     //  цвет группы ботов
        botID:  '',     //  идентификатор бота
        offerID:'',     //  идентификатор оффера или null в случае ошибки
        error: {},	// объект error в случае ошибки, null в случае успеха
        assets:[1, 2, 3, ... ] // массив с assetid вещей
        secret: ''	// восьмизначный секретный токен, уникальный для каждой попытки создать трейд оффер.
    }
    


или HTTP статус 400 и объект error в формате json в случае неправильно сформированного запроса
или HTTP статус 500 и объект error в формате json в случае серьёзной ошибки




POST /withdraw

Принимает такой объект

{

    steamid: '', // steamid пользователя
    token: '',   // token из трейдлинка пользователя  
    assets: [
        
        {color: '', botID: '', assetID: ''},
        {color: '', botID: '', assetID: ''},
        ... ,
    
    ]   // массив объектов
    
}


Возвращает HTTP статус 200 и объект в формате json. Объект содержит данные о попытке создания каждого трейд оффера

[
    {
    
        color:  '',     //  цвет группы ботов
        botID:  '',     //  идентификатор бота
        offerID:'',     //  идентификатор оффера или null в случае ошибки
        error: {},	// объект error в случае ошибки, null в случае успеха
        assets:[1, 2, 3, ... ] // массив с assetid вещей
        secret: ''	// восьмизначный секретный токен, уникальный для каждой попытки создать трейд оффер.
    }, 
    
    ... ,
]

или HTTP статус 400 и объект error в формате json в случае неправильно сформированного запроса
или HTTP статус 500 и объект error в формате json в случае серьёзной ошибки


//////////////////////////////////////

Объект Error

{

    level: '' // green - ошибка, не нарушающая работу бота/сервера, yellow - сервер/бот будет недоступен в течении небольшого промежутка времени, red - ошибка привела к остановке бота/сервера
    code: 1, // код ошибки, number
    error: // описание ошибки. Null или string. 
    
}

Коды ошибок

{
	
	1: {level:'yellow', description: 'Web logon event timed out'},                 // Бот не смог авторизоваться, требуется перезапуск
	2: {level:'red', description: 'No sentry file, bot cannot start'},             // Бот не может запуститься, отсутствует файл steamguard
	3: {level:'green', description: ''},
	4: {level:'green', description: ''},
	5: {level:'green', description: 'Error while getting user inventory'},
	6: {level:'green', description: ''},
	7: {level:'yellow', description: 'Community logon failed with error'},         // Бот не смог авторизоваться в steamcommunity
	8: {level:'yellow', description: 'Community logon failed without  error'},     // Бот не смог авторизоваться в steamcommunity
	9: {level:'green', description: ''},
	10: {level:'green', description: 'Cannot get trade hold duration'},            // Бот не смог получить холд. Юзеру нужно предложить попытаться отправить трейд снова через информер.
	11: {level:'green', description: 'User is escrowed'},                          // У юзера не включена мобильная аутентификация. Нужно предложить включить через информер.
	12: {level:'red', description: 'Bot is escrowed'},                             // У бота не включена мобильная аутентификация. 
	13: {level:'green', description: 'Failed to fetch bot inventory'},             // Бот не смог получить свой инвентарь. Юзеру нужно предложить попытаться отправить трейд снова через информер.
	14: {level:'yellow', description: 'Steam API returned HTTP error'},            // HTTP ошибка Steam API. Юзеру нужно предложить попытаться отправить трейд снова ЧЕРЕЗ НЕСКОЛЬКО МИНУТ через информер.
	15: {level:'yellow', description: 'Trade offer parameters are invalid'},       // Неверные параметры оффера. Юзеру нужно предложить попытаться отправить трейд снова ЧЕРЕЗ НЕСКОЛЬКО МИНУТ через информер.
	16: {level:'green', description: 'Steam API is busy'},                         // Steam API перенагружено. Юзеру нужно предложить попытаться отправить трейд снова через информер.
	17: {level:'yellow', description: 'Steam API access denied'},                  // Доступ запрещён. Юзеру нужно предложить проверить настройки приватности инвентаря и попробовать снова.
	18: {level:'green', description: 'Offer creation timeout'},                    // Таймаут. Юзеру необходимо предложить отменить все трейды!
	19: {level:'green', description: 'User is trade banned'},                      // У юзера трейдбан
	20: {level:'green', description: 'Steam API service unavailable'},             // Steam API перенагружено. Юзеру нужно предложить попытаться отправить трейд снова ЧЕРЕЗ НЕСКОЛЬКО МИНУТ через информер.
	21: {level:'green', description: 'Trade offer limit reached'},                 // Достигнут лимит открытых трейд офферов у бота. Юзеру нужно предложить попытаться отправить трейд снова через информер.
	22: {level:'green', description: 'Trade offer revoked'},                       // Ошибка при листинге предметов. Юзеру нужно предложить попытаться отправить трейд снова, выбрав меньше вещей.
	23: {level:'yellow', description: 'Generic Steam API error'},                  // Дженерик ошибка. Юзеру нужно предложить попытаться отправить трейд снова ЧЕРЕЗ НЕСКОЛЬКО МИНУТ через информер.
	24: {level:'green', description: 'Trade URL is invalid'},		       // Трейдлинк протух.	 
	25: {level:'green', description: ''},
	26: {level:'green', description: ''},
	27: {level:'green', description: 'Cannot get trade offer'},                    // Ошибка получения трейд оффера по айди. Попытаться снова.
	28: {level:'green', description: 'No new assetIDs'},                           // Ошибка получения новых ассет айди. Попытаться снова. Скорее всего произойдёт откат трейд оффера.
	29: {level:'green', description: 'Cannot get new asset IDs'},                  // Ошибка получения новых ассет айди. Попытаться снова.
	31: {level:'green', description: 'Trade offer not found'},                     // Ошибка получения трейд оффера по айди. Попытаться снова.
	32: {level:'green', description: 'Trade offer request timed out'},             // Таймаут при получении трейд оффера. Попытаться снова.
	33: {level:'green', description: 'Trade offer is invalid'},                    // Трейд оффер протух. Отмена.
	34: {level:'green', description: 'Error getting confirmed trade offer'},       // Ошибка получения подтверждения. Попытаться снова. 
	35: {level:'green', description: 'Trade offer is glitched'},                   // Трейд оффер протух. Возможен откат, попытаться снова.
	36: {level:'green', description: 'No confirmation corresponds this trade offer ID'},    // Не получено подтверждение мобильного аутентификатора. Попытаться снова.
	37: {level:'yellow', description: 'Error responding to confirmation'},         // Ошибка мобильного аутентификатора. Попытаться снова.    
	38: {level:'yellow', description: 'Mobile confirmation timed out'},            // Таймаут мобильного аутентификатора. Попытаться снова.
	39: {level:'green', description: ''},
	40: {level:'yellow', description: 'Error cancelling offer'},	               // Ошибка отмены оффера на стороне бота. Попытаться снова.
	41: {level:'green', description: ''},
	42: {level:'green', description: ''},
	43: {level:'green', description: ''},
	44: {level:'green', description: ''},
	45: {level:'green', description: ''},
	46: {level:'green', description: ''},
	47: {level:'green', description: ''},
	48: {level:'green', description: ''},
	49: {level:'green', description: ''},
	50: {level:'green', description: 'Bot API request timed out'},	                // Таймаут API запроса
	51: {level:'green', description: 'Invalid cluster'},                            // Такого цвета группы ботов не существует
	52: {level:'green', description: 'Invalid trade offer creation request'},       // Неправильный запрос на создание оффера
	53: {level:'green', description: 'Invalid trade offer state request'},          // Неправильный запрос на состояние оффера
	54: {level:'green', description: 'No available clusters'},                      // Все бот-серверы недоступны в данный момент
	55: {level:'green', description: 'No available bots'},				// Все боты в пределах кластера недоступны
	56: {level:'green', description: ''},
	57: {level:'green', description: ''},
	58: {level:'green', description: ''},
	59: {level:'green', description: ''},
	60: {level:'green', description: ''},

	
}

Сообщения информера в ответ на коды ошибок

10 - жёлтый - Offer creation failed. Please try again.
11 - красный - You must have mobile trade offer confirmations enabled to exchange items with our bot.
12 - красный - Bot has malfunctioned. Please contact support.
14 - жёлтый - Offer creation failed. Please try again in a few minutes.
15 - жёлтый - Offer creation failed. Please try again in a few minutes.
16 - жёлтый - Offer creation failed. Please try again.
17 - жёлтый - Offer creation failed. Please check your inventory privacy settings and try again in a few minutes.
18 - красный - Steam error. Please cancel all incoming trades.
18 - красный - It seems that you are trade banned.
19 - жёлтый - Offer creation failed. Please try again in a few minutes.
20 - жёлтый - Offer creation failed. Please try again in a few minutes.
20 - жёлтый - Offer creation failed. Please try again in a few minutes.
22 - жёлтый - Item mismatch. Please try fewer or different items.
23 - жёлтый - Offer creation failed. Please try again in a few minutes.
24 - жёлтый - Please provide a valid trade URL.

Сообщения информера в ответ на статусы

	completed (помним про newItems в депозите) — зеленый — Trade completed.
	counter — красный — Counter offers are not allowed.
	expired — жёлтый — Trade offer has expired.
	cancelled — жёлтый — Trade offer has been cancelled due to timeout.
	declined — жёлтый — Trade offer has been declined by user.
	obsolete — жёлтый — Trade offer has been cancelled due to security reasons.
	conf_pending — голубой — Trade offer pending mobile confirmation.
	conf_declined — жёлтый — Trade offer has been cancelled due to security reasons.
	escrowed — красный — Trade bot has malfunctioned. Please contact support.

*/
